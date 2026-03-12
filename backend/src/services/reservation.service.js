import { prisma } from "../prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { paginationMeta } from "../utils/apiFeatures.js";
import { createNotification } from "./notification.service.js";

const getConfig = async () => {
  const defaults = { reservation_window_hr: 24, max_loan_days: 14 };
  try {
    const config = await prisma.systemConfig.findFirst({
      orderBy: { id: "desc" },
      select: {
        id: true,
        reservation_window_hr: true,
        max_loan_days: true,
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

const reindexQueuedReservations = async (tx, bookId, orderedReservationIds = null) => {
  const allRows = await tx.reservation.findMany({
    where: { book_id: bookId },
    orderBy: [{ reserved_at: "asc" }, { id: "asc" }],
    select: { id: true, status: true },
  });

  const queuedFromDb = allRows.filter((row) => row.status === "QUEUED").map((row) => row.id);
  const queuedSet = new Set(queuedFromDb);

  let queued = orderedReservationIds ? orderedReservationIds.filter((id) => queuedSet.has(id)) : queuedFromDb;
  // Ensure we don't drop queued IDs not present in orderedReservationIds.
  queued = [...queued, ...queuedFromDb.filter((id) => !queued.includes(id))];

  const nonQueued = allRows.filter((row) => row.status !== "QUEUED").map((row) => row.id);
  const orderedAll = [...queued, ...nonQueued];

  const maxQueue = await tx.reservation.aggregate({
    where: { book_id: bookId },
    _max: { queue_position: true },
  });
  const tempStart = Number(maxQueue._max.queue_position ?? 0) + 1000;

  // Phase 1: move every reservation to a collision-free temporary band.
  await Promise.all(
    orderedAll.map((id, idx) =>
      tx.reservation.update({
        where: { id },
        data: { queue_position: tempStart + idx + 1 },
      }),
    ),
  );

  // Phase 2: rewrite positions so QUEUED rows are always 1..N, others follow.
  await Promise.all(
    orderedAll.map((id, idx) =>
      tx.reservation.update({
        where: { id },
        data: { queue_position: idx + 1 },
      }),
    ),
  );

  return queued.length;
};

const getNextQueuePosition = async (tx, bookId) => {
  const current = await tx.reservation.aggregate({
    where: { book_id: bookId },
    _max: { queue_position: true },
  });
  return Number(current._max.queue_position ?? 0) + 1;
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

  const reservation = await prisma.$transaction(async (tx) => {
    const queuePosition = await getNextQueuePosition(tx, book_id);
    const created = await tx.reservation.create({
      data: {
        user_id: userId,
        actor_user_id: options.actorUserId || userId,
        student_profile_id: options.studentProfileId || null,
        book_id,
        queue_position: queuePosition,
        status: "QUEUED",
      },
      include: RESERVATION_INCLUDE,
    });

    await reindexQueuedReservations(tx, book_id);
    return tx.reservation.findUnique({ where: { id: created.id }, include: RESERVATION_INCLUDE });
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

  const cancelled = await prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: { status: "CANCELLED", cancelled_at: new Date() },
    });
    await reindexQueuedReservations(tx, reservation.book_id);
    return updated;
  });

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

  const userIds = Array.from(new Set(reservations.map((item) => item.user_id).filter(Boolean)));
  const debtByUserId = new Map();

  if (userIds.length > 0) {
    const debtRows = await prisma.rental.groupBy({
      by: ["user_id"],
      where: {
        user_id: { in: userIds },
        status: "PENDING",
        fine: { gt: 0 },
        return_date: { not: null },
      },
      _sum: { fine: true },
    });

    debtRows.forEach((row) => {
      debtByUserId.set(row.user_id, Number(row._sum.fine ?? 0));
    });
  }

  const enriched = reservations.map((item) => ({
    ...item,
    user_debt_total: Number(debtByUserId.get(item.user_id) ?? 0),
  }));

  return { reservations: enriched, meta: paginationMeta(total, page, limit) };
};

export const moveReservationToTop = async (reservationId) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, book_id: true, status: true },
  });

  if (!reservation) throw new AppError("Reservation not found", 404);
  if (reservation.status !== "QUEUED") {
    throw new AppError("Only QUEUED reservations can be moved to top", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const queued = await tx.reservation.findMany({
      where: { book_id: reservation.book_id, status: "QUEUED" },
      orderBy: [{ queue_position: "asc" }, { reserved_at: "asc" }],
      select: { id: true },
    });

    const ordered = [reservation.id, ...queued.map((item) => item.id).filter((id) => id !== reservation.id)];
    await reindexQueuedReservations(tx, reservation.book_id, ordered);

    return tx.reservation.findUnique({ where: { id: reservation.id }, include: RESERVATION_INCLUDE });
  });

  return result;
};

export const fulfillReservationAsRental = async (reservationId, adminUserId, body, io) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      ...RESERVATION_INCLUDE,
      user: { select: { id: true, name: true, email: true, student_id: true } },
    },
  });

  if (!reservation) throw new AppError("Reservation not found", 404);
  if (!["QUEUED", "NOTIFIED"].includes(reservation.status)) {
    throw new AppError("Only active reservations can be fulfilled", 400);
  }

  const debt = await prisma.rental.aggregate({
    where: {
      user_id: reservation.user_id,
      status: "PENDING",
      fine: { gt: 0 },
      return_date: { not: null },
    },
    _sum: { fine: true },
  });
  const outstandingDebt = Number(debt._sum.fine ?? 0);
  if (outstandingDebt > 0) {
    throw new AppError(
      `Student has outstanding overdue fines (${outstandingDebt.toFixed(2)} ETB). Clear debt before issuing reserved book.`,
      409,
    );
  }

  const copyCode = String(body?.copy_code || "").trim();
  if (!copyCode) {
    throw new AppError("copy_code is required to issue a reserved book", 400);
  }

  const copy = await prisma.bookCopy.findFirst({
    where: {
      book_id: reservation.book_id,
      copy_code: copyCode,
      deleted_at: null,
      is_available: true,
    },
    select: { id: true, copy_code: true },
  });
  if (!copy) {
    throw new AppError("Selected copy is not available for handover", 409);
  }

  const config = await getConfig();
  const loanDays = Math.max(1, Number(config.max_loan_days ?? 14));
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + loanDays);

  const { fulfilledReservation, rental } = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findFirst({
      where: { id: reservation.book_id, deleted_at: null },
      select: { id: true, title: true, available: true },
    });
    if (!book) throw new AppError("Book not found", 404);
    if (book.available <= 0) {
      throw new AppError("Book is currently unavailable to issue", 409);
    }

    const existingActive = await tx.rental.findFirst({
      where: {
        user_id: reservation.user_id,
        book_id: reservation.book_id,
        status: { in: ["BORROWED", "PENDING"] },
      },
      select: { id: true },
    });
    if (existingActive) {
      throw new AppError("Student already has an active rental for this book", 409);
    }

    const createdRental = await tx.rental.create({
      data: {
        user_id: reservation.user_id,
        actor_user_id: adminUserId,
        student_profile_id: reservation.student_profile_id,
        book_id: reservation.book_id,
        copy_id: copy.id,
        due_date: dueDate,
        status: "BORROWED",
      },
      include: {
        user: { select: { id: true, name: true, email: true, student_id: true } },
        physical_book: { select: { id: true, title: true, cover_image_url: true } },
        copy: { select: { id: true, copy_code: true } },
      },
    });

    await tx.bookCopy.update({
      where: { id: copy.id },
      data: { is_available: false },
    });

    await tx.book.update({
      where: { id: reservation.book_id },
      data: { available: { decrement: 1 } },
    });

    const archivedQueuePosition = await getNextQueuePosition(tx, reservation.book_id);

    const updatedReservation = await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        status: "FULFILLED",
        fulfilled_at: new Date(),
        queue_position: archivedQueuePosition,
      },
      include: RESERVATION_INCLUDE,
    });

    await reindexQueuedReservations(tx, reservation.book_id);
    return { fulfilledReservation: updatedReservation, rental: createdRental };
  });

  await createNotification({
    userId: reservation.user_id,
    message: `Your reservation for "${reservation.book.title}" has been issued. Copy: ${copy.copy_code}.`,
    type: "RESERVATION",
    io,
  });

  return { reservation: fulfilledReservation, rental };
};

export const getHighDemandReservations = async (query = {}) => {
  const minQueue = Math.max(1, parseInt(query.min_queue, 10) || 3);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));

  const grouped = await prisma.reservation.groupBy({
    by: ["book_id"],
    where: { status: "QUEUED" },
    _count: { _all: true },
    orderBy: { _count: { book_id: "desc" } },
    take: 200,
  });

  const filtered = grouped.filter((row) => Number(row._count._all) >= minQueue).slice(0, limit);
  if (filtered.length === 0) return { books: [] };

  const bookIds = filtered.map((row) => row.book_id);
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds }, deleted_at: null },
    select: {
      id: true,
      title: true,
      copies: true,
      available: true,
      cover_image_url: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const byId = new Map(books.map((book) => [book.id, book]));
  const demand = filtered
    .map((row) => {
      const book = byId.get(row.book_id);
      if (!book) return null;
      const queueCount = Number(row._count._all);
      const copies = Number(book.copies || 0);
      const pressureRatio = copies > 0 ? Number((queueCount / copies).toFixed(2)) : queueCount;
      return {
        book,
        queueCount,
        pressureRatio,
        needsInventoryAction: queueCount >= 10 && copies <= 2,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.queueCount - a.queueCount);

  return { books: demand };
};

export const expirePendingReservations = async (io, options = {}) => {
  const notifyUsers = options.notifyUsers !== false;
  const now = new Date();
  let where = {};

  if (options.reservationIds && Array.isArray(options.reservationIds)) {
    where = { id: { in: options.reservationIds } };
  } else {
    where = {
      status: "NOTIFIED",
      expires_at: { lt: now },
    };
  }

  const expired = await prisma.reservation.findMany({
    where,
    include: {
      book: { select: { id: true, title: true } },
      user: { select: { id: true, name: true } },
    },
  });

  let count = 0;
  for (const item of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: item.id },
        data: { status: "CANCELLED", cancelled_at: new Date() },
      });
      await reindexQueuedReservations(tx, item.book.id);
    });

    if (notifyUsers) {
      await createNotification({
        userId: item.user.id,
        message: `Your reservation window for "${item.book.title}" expired. You can reserve it again.`,
        type: "RESERVATION",
        io,
      });
    }

    await notifyNextInQueue(item.book.id, io, { notifyUsers });
    count += 1;
  }

  const expiredDetails = expired.map((item) => ({
    id: item.id,
    studentName: item.user.name,
    bookTitle: item.book.title,
  }));

  return { expiredCount: count, notifyUsers, expiredReservations: expiredDetails };
};

export const notifyNextInQueue = async (bookId, io, options = {}) => {
  const notifyUsers = options.notifyUsers !== false;
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

  if (notifyUsers) {
    await createNotification({
      userId: updated.user_id,
      message: `Good news! "${book.title}" is now available for you. Reserve window ends on ${expiresAt.toLocaleString()}.`,
      type: "RESERVATION",
      io,
    });
  }

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

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        status: "FULFILLED",
        fulfilled_at: new Date(),
      },
    });
    await reindexQueuedReservations(tx, bookId);
    return updated;
  });

  return result;
};

export const rebalanceQueuePositions = async (bookId) => {
  return prisma.$transaction((tx) => reindexQueuedReservations(tx, bookId));
};
