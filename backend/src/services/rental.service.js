/**
 * Rental Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete borrowing lifecycle for physical books:
 *
 * Statuses (from Prisma enum):
 *   BORROWED   – book checked out, not yet due
 *   PENDING    – book returned but fine not yet paid
 *   RETURNED   – book returned, no fine OR fine paid (via COMPLETED on Payment)
 *   COMPLETED  – fully closed (returned + fine settled)
 *
 * Business Rules:
 *   1. Max books per user (from SystemConfig)
 *   2. Available copies must be > 0
 *   3. User cannot borrow same book twice while borrowed
 *   4. On return: calculate fine if overdue, deduct from available
 *   5. Fine = overdue_days × daily_fine (from SystemConfig)
 *   6. Overdue = due_date has passed and status is still BORROWED
 *
 * Notifications:
 *   - Student: borrow confirmed, approaching due date (on-request), return confirmed,
 *              fine applied, fine paid
 *   - Admin:   new borrow, overdue alert, book returned
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';
import { createNotification, notifyAdmins } from './notification.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch the latest system config, throw if none exists. */
const getConfig = async () => {
  const config = await prisma.systemConfig.findFirst({ orderBy: { id: 'desc' } });
  if (!config) {
    throw new AppError(
      'System configuration is not set up. Please contact the admin.',
      503
    );
  }
  return config;
};

/**
 * Calculate fine for an overdue return.
 * @param {Date} dueDate
 * @param {Date} returnDate
 * @param {number|import('@prisma/client').Decimal} dailyFine
 * @returns {number} fine amount (0 if not overdue)
 */
const calculateFine = (dueDate, returnDate, dailyFine) => {
  const due = new Date(dueDate);
  const returned = new Date(returnDate);
  if (returned <= due) return 0;
  const overdueDays = Math.ceil((returned.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return parseFloat((overdueDays * Number(dailyFine)).toFixed(2));
};

/** Full include for a rental record */
const RENTAL_INCLUDE = {
  user: { select: { id: true, name: true, email: true, student_id: true } },
  physical_book: {
    select: { id: true, title: true, cover_image_url: true, pages: true },
  },
  payment: {
    select: {
      id: true, tx_ref: true, amount: true, method: true, status: true, paid_at: true,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST ALL RENTALS (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin: Paginated rental list with rich filters.
 *
 * Query params:
 *   ?status=BORROWED|PENDING|RETURNED|COMPLETED
 *   ?user_id=         – filter by student
 *   ?book_id=         – filter by book
 *   ?overdue=true     – only show overdue (BORROWED + past due date)
 *   ?sort=-loan_date|due_date|-due_date  (default: -loan_date)
 *   ?page=1&limit=20
 */
export const getAllRentals = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const VALID_STATUSES = ['BORROWED', 'PENDING', 'RETURNED', 'COMPLETED'];
  const where = /** @type {any} */ ({});

  if (query.status) {
    const s = query.status.toUpperCase();
    if (!VALID_STATUSES.includes(s)) throw new AppError(`Invalid status: ${s}`, 400);
    where.status = s;
  }

  if (query.user_id) where.user_id = query.user_id;
  if (query.book_id) where.book_id = query.book_id;

  // Overdue filter: borrowed AND past due date
  if (query.overdue === 'true') {
    where.status = 'BORROWED';
    where.due_date = { lt: new Date() };
  }

  // Search by student name or book title
  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { physical_book: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const ALLOWED = ['loan_date', 'due_date', 'return_date'];
  let orderBy = [{ loan_date: 'desc' }];
  if (query.sort) {
    const desc = query.sort.startsWith('-');
    const field = desc ? query.sort.slice(1) : query.sort;
    if (ALLOWED.includes(field)) orderBy = [{ [field]: desc ? 'desc' : 'asc' }];
  }

  const [rentals, total] = await Promise.all([
    prisma.rental.findMany({ where, include: RENTAL_INCLUDE, orderBy, skip, take: limit }),
    prisma.rental.count({ where }),
  ]);

  // Enrich with overdue flag
  const now = new Date();
  const enriched = rentals.map((r) => ({
    ...r,
    isOverdue: r.status === 'BORROWED' && new Date(r.due_date) < now,
    daysOverdue:
      r.status === 'BORROWED' && new Date(r.due_date) < now
        ? Math.ceil((now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
  }));

  return { rentals: enriched, meta: paginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// MY RENTALS (Student dashboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Student: My rental history with overdue detection.
 *
 * Query params same as getAllRentals, but user_id is implicitly the logged-in user.
 *   ?status=BORROWED|PENDING|RETURNED|COMPLETED
 *   ?active=true  – only show BORROWED + PENDING
 */
export const getMyRentals = async (userId, query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const VALID_STATUSES = ['BORROWED', 'PENDING', 'RETURNED', 'COMPLETED'];
  const where = /** @type {any} */ ({ user_id: userId });

  if (query.status) {
    const s = query.status.toUpperCase();
    if (!VALID_STATUSES.includes(s)) throw new AppError(`Invalid status: ${s}`, 400);
    where.status = s;
  }

  // Convenience: ?active=true → show only BORROWED and PENDING
  if (query.active === 'true') {
    where.status = { in: ['BORROWED', 'PENDING'] };
  }

  const [rentals, total, counts] = await Promise.all([
    prisma.rental.findMany({
      where,
      include: RENTAL_INCLUDE,
      orderBy: { loan_date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.rental.count({ where }),
    // Summary counts for student dashboard header
    prisma.rental.groupBy({
      by: ['status'],
      where: { user_id: userId },
      _count: { status: true },
    }),
  ]);

  console.log("yohannes")

  const now = new Date();
  const enriched = rentals.map((r) => ({
    ...r,
    isOverdue: r.status === 'BORROWED' && new Date(r.due_date) < now,
    daysOverdue:
      r.status === 'BORROWED' && new Date(r.due_date) < now
        ? Math.ceil((now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    daysUntilDue:
      r.status === 'BORROWED' && new Date(r.due_date) >= now
        ? Math.ceil((new Date(r.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
  }));

  const statusSummary = counts.reduce((acc, c) => {
    acc[c.status] = c._count.status;
    return acc;
  }, {});

  return { rentals: enriched, statusSummary, meta: paginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE RENTAL
// ─────────────────────────────────────────────────────────────────────────────

export const getRentalById = async (id, user) => {
  const rental = await prisma.rental.findUnique({
    where: { id },
    include: RENTAL_INCLUDE,
  });
  if (!rental) throw new AppError('Rental not found', 404);

  // Students can only see their own
  if (user.role !== 'ADMIN' && rental.user_id !== user.id) {
    throw new AppError('Forbidden', 403);
  }

  const now = new Date();
  return {
    ...rental,
    isOverdue: rental.status === 'BORROWED' && new Date(rental.due_date) < now,
    daysOverdue:
      rental.status === 'BORROWED' && new Date(rental.due_date) < now
        ? Math.ceil((now.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// BORROW A BOOK (Student)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Borrow a physical book.
 * Body: { book_id, loan_days? (optional override) }
 *
 * Checks:
 *   1. Book exists and not soft deleted
 *   2. Book has available copies
 *   3. User hasn't exceeded max_books_per_user
 *   4. User doesn't already have this book borrowed
 *
 * Effects:
 *   - Decrements book.available atomically
 *   - Notifies student (INFO)
 *   - Notifies admins (INFO)
 */
export const borrowBook = async (userId, { book_id, loan_days }, io) => {
  if (!book_id) throw new AppError('book_id is required', 400);

  const [config, book, user] = await Promise.all([
    getConfig(),
    prisma.book.findFirst({
      where: { id: book_id, deleted_at: null },
      select: { id: true, title: true, available: true, copies: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, is_blocked: true },
    }),
  ]);

  if (!book) throw new AppError('Book not found', 404);
  if (!user) throw new AppError('User not found', 404);
  if (user.is_blocked) throw new AppError('Your account is blocked. Contact the library.', 403);
  if (book.available <= 0) {
    throw new AppError(
      `"${book.title}" has no available copies. Please check back later or add to your wishlist.`,
      400
    );
  }

  // Check per-user active rental limit
  const activeRentals = await prisma.rental.count({
    where: { user_id: userId, status: { in: ['BORROWED', 'PENDING'] } },
  });
  if (activeRentals >= config.max_books_per_user) {
    throw new AppError(
      `You have reached your maximum of ${config.max_books_per_user} active rental(s). Return a book first.`,
      400
    );
  }

  // Prevent duplicate borrow
  const alreadyBorrowed = await prisma.rental.findFirst({
    where: { user_id: userId, book_id, status: { in: ['BORROWED', 'PENDING'] } },
  });
  if (alreadyBorrowed) {
    throw new AppError('You already have this book. Return it before borrowing again.', 409);
  }

  // Calculate due date
  const loanDays = parseInt(loan_days, 10) || config.max_loan_days;
  if (loanDays < 1 || loanDays > config.max_loan_days) {
    throw new AppError(`Loan period must be between 1 and ${config.max_loan_days} days`, 400);
  }
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + loanDays);

  // Atomic transaction: create rental + decrement available
  const [rental] = await prisma.$transaction([
    prisma.rental.create({
      data: {
        user_id: userId,
        book_id,
        due_date: dueDate,
        status: 'BORROWED',
      },
      include: RENTAL_INCLUDE,
    }),
    prisma.book.update({
      where: { id: book_id },
      data: { available: { decrement: 1 } },
    }),
  ]);

  // ── Notifications ──────────────────────────────────────────────────────────

  const dueDateStr = dueDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Student notification
  await createNotification({
    userId,
    message: `📚 You have successfully borrowed "${book.title}". Please return it by ${dueDateStr}. Loan period: ${loanDays} day(s).`,
    type: 'INFO',
    io,
  });

  // Admin notifications
  await notifyAdmins({
    message: `📖 ${user.name} (${user.email}) has borrowed "${book.title}". Due: ${dueDateStr}. Remaining copies: ${book.available - 1}.`,
    type: 'INFO',
    io,
  });

  return { ...rental, daysUntilDue: loanDays, dueDate };
};

// ─────────────────────────────────────────────────────────────────────────────
// RETURN A BOOK (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process book return. Admin only.
 * Computes fine automatically.
 *
 * Return statuses after return:
 *   - No fine → status = RETURNED
 *   - Fine > 0 → status = PENDING (awaiting payment)
 *
 * Notifies student and admins.
 */
export const returnBook = async (rentalId, io) => {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      physical_book: { select: { id: true, title: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!rental) throw new AppError('Rental not found', 404);
  if (rental.status === 'RETURNED' || rental.status === 'COMPLETED') {
    throw new AppError('This book has already been returned', 400);
  }

  const config = await getConfig();
  const returnDate = new Date();
  const fine = calculateFine(rental.due_date, returnDate, config.daily_fine);
  const newStatus = fine > 0 ? 'PENDING' : 'RETURNED';

  // Atomic: update rental + restore available
  const [updated] = await prisma.$transaction([
    prisma.rental.update({
      where: { id: rentalId },
      data: {
        status: /** @type {any} */ (newStatus),
        return_date: returnDate,
        fine: fine > 0 ? fine : null,
      },
      include: RENTAL_INCLUDE,
    }),
    prisma.book.update({
      where: { id: rental.book_id },
      data: { available: { increment: 1 } },
    }),
  ]);

  // ── Notifications ──────────────────────────────────────────────────────────

  const returnDateStr = returnDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (fine > 0) {
    const overdueDays = Math.ceil(
      (returnDate.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Student: fine applied
    await createNotification({
      userId: rental.user_id,
      message: `⚠️ You returned "${rental.physical_book.title}" ${overdueDays} day(s) late. A fine of ${fine.toFixed(2)} ETB has been applied. Please pay to complete the return.`,
      type: 'ALERT',
      io,
    });

    // Admins
    await notifyAdmins({
      message: `📋 ${rental.user.name} returned "${rental.physical_book.title}" ${overdueDays} day(s) late. Fine: ${fine.toFixed(2)} ETB. Awaiting payment.`,
      type: 'INFO',
      io,
    });
  } else {
    // Student: clean return
    await createNotification({
      userId: rental.user_id,
      message: `✅ You have successfully returned "${rental.physical_book.title}" on ${returnDateStr}. Thank you!`,
      type: 'INFO',
      io,
    });

    // Admins
    await notifyAdmins({
      message: `✅ ${rental.user.name} returned "${rental.physical_book.title}" on time on ${returnDateStr}.`,
      type: 'INFO',
      io,
    });
  }

  return { ...updated, fine, newStatus };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET OVERDUE RENTALS (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All rentals where status = BORROWED and due_date < now.
 * Includes how many days overdue and estimated fine.
 */
export const getOverdueRentals = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = /** @type {any} */ ({
    status: 'BORROWED',
    due_date: { lt: new Date() },
  });

  if (query.user_id) where.user_id = query.user_id;

  const [rentals, total, config] = await Promise.all([
    prisma.rental.findMany({
      where,
      include: RENTAL_INCLUDE,
      orderBy: { due_date: 'asc' }, // most overdue first
      skip,
      take: limit,
    }),
    prisma.rental.count({ where }),
    getConfig(),
  ]);

  const now = new Date();
  const enriched = rentals.map((r) => {
    const daysOverdue = Math.ceil(
      (now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...r,
      daysOverdue,
      estimatedFine: parseFloat((daysOverdue * Number(config.daily_fine)).toFixed(2)),
    };
  });

  return { rentals: enriched, meta: paginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND OVERDUE REMINDERS (Admin cron action)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin triggers overdue reminders for all overdue borrowers.
 * Returns count of notifications sent.
 */
export const sendOverdueReminders = async (io) => {
  const overdue = await prisma.rental.findMany({
    where: /** @type {any} */ ({ status: 'BORROWED', due_date: { lt: new Date() } }),
    select: {
      id: true,
      user_id: true,
      due_date: true,
      physical_book: { select: { title: true } },
    },
  });

  const config = await getConfig();
  const now = new Date();
  let sent = 0;

  for (const rental of overdue) {
    const daysOverdue = Math.ceil(
      (now.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const estimatedFine = parseFloat((daysOverdue * Number(config.daily_fine)).toFixed(2));

    await createNotification({
      userId: rental.user_id,
      message: `🔴 OVERDUE ALERT: "${rental.physical_book.title}" was due ${daysOverdue} day(s) ago. Estimated fine: ${estimatedFine} ETB. Please return it immediately.`,
      type: 'ALERT',
      io,
    });
    sent++;
  }

  return { remindersSent: sent };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN EXTEND DUE DATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin can extend a rental's due date.
 * Body: { extra_days }
 */
export const extendRental = async (rentalId, { extra_days }, io) => {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      user: { select: { id: true, name: true } },
      physical_book: { select: { title: true } },
    },
  });
  if (!rental) throw new AppError('Rental not found', 404);
  if (rental.status !== 'BORROWED') {
    throw new AppError('Can only extend active (BORROWED) rentals', 400);
  }

  const days = parseInt(extra_days, 10);
  if (!days || days < 1 || days > 30) {
    throw new AppError('extra_days must be between 1 and 30', 400);
  }

  const newDueDate = new Date(rental.due_date);
  newDueDate.setDate(newDueDate.getDate() + days);

  const updated = await prisma.rental.update({
    where: { id: rentalId },
    data: { due_date: newDueDate },
    include: RENTAL_INCLUDE,
  });

  // Notify student
  await createNotification({
    userId: rental.user_id,
    message: `📅 Great news! Your rental of "${rental.physical_book.title}" has been extended by ${days} day(s). New due date: ${newDueDate.toDateString()}.`,
    type: 'INFO',
    io,
  });

  return updated;
};
