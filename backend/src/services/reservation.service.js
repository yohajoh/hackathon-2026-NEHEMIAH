import { prisma } from "../prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { paginationMeta } from "../utils/apiFeatures.js";
import { createNotification } from "./notification.service.js";

const getConfig = async () => {
  const defaults = { reservation_window_hr: 24 };
  try {
    const config = await prisma.systemConfig.findFirst({
      orderBy: { id: "desc" },
      select: {
        id: true,
        reservation_window_hr: true,
      },
    });
    return config ? { ...defaults, ...config } : defaults;
  } catch (error) {
    // Backward compatibility: DB might not yet include reservation_window_hr.
    if (error?.code === "P2022") {
      const legacy = await prisma.systemConfig.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      return legacy ? { ...defaults, ...legacy } : defaults;
    }
    throw error;
  }
};

const RESERVATION_INCLUDE = {
  user: { select: { id: true, name: true, email: true, student_id: true } },
  book: {
    select: {
      id: true,
      title: true,
      cover_image_url: true,
      available: true,
      copies: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  },
};

export const getMyReservations = async (userId, query, options = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = {
    user_id: userId,
    ...(options.studentProfileId ? { student_profile_id: options.studentProfileId } : {}),
  };
  if (query.status) where.status = query.status;

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: RESERVATION_INCLUDE,
      orderBy: [{ status: "asc" }, { reserved_at: "desc" }],
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { reservations, meta: paginationMeta(total, page, limit) };
};

export const createReservation = async (userId, { book_id }, io, options = {}) => {
  if (!book_id) throw new AppError("book_id is required", 400);

  const book = await prisma.book.findFirst({
    where: { id: book_id, deleted_at: null },
    select: { id: true, title: true, available: true },
  });
  if (!book) throw new AppError("Book not found", 404);
  if (book.available > 0) {
    throw new AppError("Book is currently available. Borrow directly instead of reserving.", 400);
  }

  const existing = await prisma.reservation.findFirst({
    where: {
      user_id: userId,
      ...(options.studentProfileId ? { student_profile_id: options.studentProfileId } : {}),
      book_id,
      status: { in: ["QUEUED", "NOTIFIED"] },
    },
  });
  if (existing) throw new AppError("You already have an active reservation for this book", 409);

  const activeReservations = await prisma.reservation.count({
    where: { book_id, status: { in: ["QUEUED", "NOTIFIED"] } },
  });

  const reservation = await prisma.reservation.create({
    data: {
      user_id: userId,
      actor_user_id: options.actorUserId || userId,
      student_profile_id: options.studentProfileId || null,
      book_id,
      queue_position: activeReservations + 1,
      status: "QUEUED",
    },
    include: RESERVATION_INCLUDE,
  });

  await createNotification({
    userId,
    message: `You joined the waitlist for "${book.title}". Queue position: ${reservation.queue_position}.`,
    type: "RESERVATION",
    io,
  });

  return reservation;
};

export const cancelReservation = async (reservationId, userId, options = {}) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { book: { select: { id: true } } },
  });

  if (!reservation) throw new AppError("Reservation not found", 404);
  if (reservation.user_id !== userId) throw new AppError("Forbidden", 403);
  if (options.studentProfileId && reservation.student_profile_id !== options.studentProfileId) {
    throw new AppError("Forbidden", 403);
  }
  if (!["QUEUED", "NOTIFIED"].includes(reservation.status)) {
    throw new AppError("Only active reservations can be cancelled", 400);
  }

  const cancelled = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CANCELLED", cancelled_at: new Date() },
  });

  await rebalanceQueuePositions(reservation.book_id);
  return cancelled;
};

export const getAllReservations = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.status) where.status = query.status;
  if (query.book_id) where.book_id = query.book_id;
  if (query.user_id) where.user_id = query.user_id;

  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { book: { title: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: RESERVATION_INCLUDE,
      orderBy: [{ status: "asc" }, { reserved_at: "asc" }],
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { reservations, meta: paginationMeta(total, page, limit) };
};

export const expirePendingReservations = async (io) => {
  const now = new Date();
  const expired = await prisma.reservation.findMany({
    where: {
      status: "NOTIFIED",
      expires_at: { lt: now },
    },
    include: {
      book: { select: { id: true, title: true } },
      user: { select: { id: true } },
    },
  });

  let count = 0;
  for (const item of expired) {
    await prisma.reservation.update({
      where: { id: item.id },
      data: { status: "EXPIRED" },
    });

    await createNotification({
      userId: item.user.id,
      message: `Your reservation window for "${item.book.title}" expired. You can reserve it again.`,
      type: "RESERVATION",
      io,
    });

    await notifyNextInQueue(item.book.id, io);
    count += 1;
  }

  return { expiredCount: count };
};

export const notifyNextInQueue = async (bookId, io) => {
  const config = await getConfig();
  const book = await prisma.book.findFirst({
    where: { id: bookId, deleted_at: null },
    select: { id: true, title: true, available: true },
  });

  if (!book || book.available <= 0) return null;

  const nextReservation = await prisma.reservation.findFirst({
    where: {
      book_id: bookId,
      status: "QUEUED",
    },
    orderBy: { queue_position: "asc" },
    include: { user: { select: { id: true } } },
  });

  if (!nextReservation) return null;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (config.reservation_window_hr ?? 24));

  const updated = await prisma.reservation.update({
    where: { id: nextReservation.id },
    data: {
      status: "NOTIFIED",
      notified_at: new Date(),
      expires_at: expiresAt,
    },
    include: RESERVATION_INCLUDE,
  });

  await createNotification({
    userId: updated.user_id,
    message: `Good news! "${book.title}" is now available for you. Reserve window ends on ${expiresAt.toLocaleString()}.`,
    type: "RESERVATION",
    io,
  });

  return updated;
};

export const markReservationFulfilledForBorrow = async (userId, bookId, options = {}) => {
  const reservation = await prisma.reservation.findFirst({
    where: {
      user_id: userId,
      ...(options.studentProfileId ? { student_profile_id: options.studentProfileId } : {}),
      book_id: bookId,
      status: { in: ["QUEUED", "NOTIFIED"] },
    },
    orderBy: { reserved_at: "asc" },
  });

  if (!reservation) return null;

  const result = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "FULFILLED",
      fulfilled_at: new Date(),
    },
  });

  await rebalanceQueuePositions(bookId);
  return result;
};

export const rebalanceQueuePositions = async (bookId) => {
  const active = await prisma.reservation.findMany({
    where: { book_id: bookId, status: "QUEUED" },
    orderBy: { reserved_at: "asc" },
    select: { id: true },
  });

  for (let i = 0; i < active.length; i += 1) {
    await prisma.reservation.update({
      where: { id: active[i].id },
      data: { queue_position: i + 1 },
    });
  }

  return active.length;
};
