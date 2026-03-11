/**
 * Review Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages book reviews and ratings with:
 *   - One review per user per book (enforced)
 *   - Full rating statistics: avg, total, star distribution
 *   - Admin moderation (delete any review)
 *   - Notifications to book author's admin when flagged (future)
 */

import { prisma } from "../prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { paginationMeta } from "../utils/apiFeatures.js";

const hasDigitalReadProgressModel = () => Boolean(prisma?.digitalReadProgress);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const validateBookType = (bookType) => {
  const bt = bookType?.toUpperCase();
  if (!["PHYSICAL", "DIGITAL"].includes(bt)) {
    throw new AppError('bookType must be "physical" or "digital"', 400);
  }
  return bt;
};

const getBookField = (bookType) => (bookType === "PHYSICAL" ? "physical_book_id" : "digital_book_id");

/**
 * Build full rating statistics for a book.
 */
const buildRatingSummary = async (bookType, bookId) => {
  const field = getBookField(bookType);
  const where = { [field]: bookId };

  const [agg, distribution] = await Promise.all([
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where,
      _count: { rating: true },
    }),
  ]);

  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((r) => {
    dist[r.rating] = r._count.rating;
  });

  return {
    average: agg._avg.rating ? parseFloat(Number(agg._avg.rating).toFixed(2)) : 0,
    total: agg._count.rating,
    distribution: dist,
    breakdown: {
      excellent: dist[5], // 5 stars
      good: dist[4], // 4 stars
      average: dist[3], // 3 stars
      poor: dist[2], // 2 stars
      terrible: dist[1], // 1 star
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET REVIEWS FOR A BOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated reviews for a book.
 *
 * Query params:
 *   ?rating=1-5     – filter by exact star count
 *   ?sort=-created_at|rating|-rating  (default: -created_at)
 *   ?page=1&limit=10
 *
 * Always returns rating summary as well as paginated reviews.
 */
export const getReviews = async (bookType, bookId, query) => {
  const bt = validateBookType(bookType);
  const field = getBookField(bt);

  console.log(`[DEBUG] getReviews: bookType=${bookType}, bookId=${bookId}, field=${field}`);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = { [field]: bookId };

  // Optional: filter by rating
  if (query.rating) {
    const r = parseInt(query.rating, 10);
    if (r >= 1 && r <= 5) where.rating = r;
  }

  // Sort
  let orderBy = [{ created_at: "desc" }];
  if (query.sort === "rating") orderBy = [{ rating: "asc" }];
  else if (query.sort === "-rating") orderBy = [{ rating: "desc" }];

  const [reviews, total, ratingSummary] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.review.count({ where }),
    buildRatingSummary(bt, bookId),
  ]);

  return {
    reviews,
    ratingSummary,
    meta: paginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY REVIEW FOR A BOOK
// ─────────────────────────────────────────────────────────────────────────────

/** Check if logged-in user has already reviewed a specific book. */
export const getMyReview = async (bookType, bookId, userId) => {
  const bt = validateBookType(bookType);
  const field = getBookField(bt);

  return prisma.review.findFirst({
    where: { [field]: bookId, user_id: userId },
    include: { user: { select: { id: true, name: true } } },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE REVIEW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a review. Enforces:
 *   - Rating must be 1-5
 *   - User can only review a book once
 *   - Book must exist and not be soft-deleted
 *   - User must have rented the physical book (optional rule, commented out for now)
 */
export const createReview = async ({ userId, authContext, bookType, bookId, rating, comment }) => {
  const bt = validateBookType(bookType);
  const field = getBookField(bt);

  const ratingInt = parseInt(rating, 10);
  if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    throw new AppError("Rating must be an integer between 1 and 5", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new AppError("User not found", 404);

  const roles = Array.isArray(authContext?.roles) ? authContext.roles : [];
  const activePersona = typeof authContext?.activePersona === "string" ? authContext.activePersona : null;

  if (!roles.includes("STUDENT")) {
    throw new AppError("Only student accounts can submit reviews", 403);
  }

  if (activePersona === "ADMIN") {
    throw new AppError("Switch to Student account to submit a review", 403);
  }

  // Validate book exists
  if (bt === "PHYSICAL") {
    const [book, activeRental, returnedRental] = await Promise.all([
      prisma.book.findFirst({ where: { id: bookId, deleted_at: null } }),
      prisma.rental.findFirst({
        where: { user_id: userId, book_id: bookId, status: { in: ["BORROWED", "PENDING"] } },
        select: { id: true },
      }),
      prisma.rental.findFirst({
        where: { user_id: userId, book_id: bookId, status: { in: ["RETURNED", "COMPLETED"] } },
        select: { id: true },
      }),
    ]);
    if (!book) throw new AppError("Physical book not found", 404);
    if (activeRental) {
      throw new AppError("Return this book before submitting a review", 403);
    }
    if (!returnedRental) {
      throw new AppError("You can review this book only after borrowing and returning it", 403);
    }
  } else {
    const [book, readProgress] = await Promise.all([
      prisma.digitalBook.findFirst({ where: { id: bookId, deleted_at: null } }),
      hasDigitalReadProgressModel()
        ? prisma.digitalReadProgress.findUnique({
            where: {
              user_id_digital_book_id: {
                user_id: userId,
                digital_book_id: bookId,
              },
            },
            select: { id: true },
          })
        : Promise.resolve({ id: "legacy-read-allowed" }),
    ]);

    if (!book) throw new AppError("Digital book not found", 404);
    if (!readProgress) {
      throw new AppError("Read this digital book first before submitting a review", 403);
    }
  }

  // One review per user per book
  const existing = await prisma.review.findFirst({
    where: { user_id: userId, [field]: bookId },
  });
  if (existing) {
    throw new AppError("You have already reviewed this book. You can edit your existing review.", 409);
  }

  const review = await prisma.review.create({
    data: {
      user_id: userId,
      book_type: /** @type {any} */ (bt),
      [field]: bookId,
      rating: ratingInt,
      comment: comment?.trim() || null,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Return updated rating summary after creation
  const ratingSummary = await buildRatingSummary(bt, bookId);

  return { review, ratingSummary };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE REVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const updateReview = async (id, userId, { rating, comment }) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Review not found", 404);
  if (review.user_id !== userId) throw new AppError("You can only edit your own reviews", 403);

  const updateData = {};
  if (rating !== undefined) {
    const ratingInt = parseInt(rating, 10);
    if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      throw new AppError("Rating must be an integer between 1 and 5", 400);
    }
    updateData.rating = ratingInt;
  }
  if (comment !== undefined) updateData.comment = comment?.trim() || null;

  const updated = await prisma.review.update({
    where: { id },
    data: updateData,
    include: { user: { select: { id: true, name: true } } },
  });

  const bookId = review.physical_book_id || review.digital_book_id;
  const ratingSummary = await buildRatingSummary(review.book_type, bookId);

  return { review: updated, ratingSummary };
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE REVIEW
// ─────────────────────────────────────────────────────────────────────────────

/** Users delete their own; admins can delete any. */
export const deleteReview = async (id, user) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Review not found", 404);
  if (user.role !== "ADMIN" && review.user_id !== user.id) {
    throw new AppError("You do not have permission to delete this review", 403);
  }
  return prisma.review.delete({ where: { id } });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET ALL REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin view of all reviews.
 * Supports:
 *   ?book_type=physical|digital
 *   ?rating=1-5
 *   ?user_id=uuid
 *   ?page=1&limit=20
 */
export const getAllReviews = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.user_id) where.user_id = query.user_id;
  if (query.book_type) {
    const bt = query.book_type.toUpperCase();
    if (["PHYSICAL", "DIGITAL"].includes(bt)) {
      where.book_type = /** @type {any} */ (bt);
    }
  }
  if (query.rating) {
    const r = parseInt(query.rating, 10);
    if (r >= 1 && r <= 5) where.rating = r;
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        physical_book: { select: { id: true, title: true } },
        digital_book: { select: { id: true, title: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  // Average rating stats
  const avgStats = await prisma.review.aggregate({ _avg: { rating: true }, _count: { id: true } });

  return {
    reviews,
    stats: {
      totalReviews: avgStats._count.id,
      averageRating: avgStats._avg.rating ? parseFloat(Number(avgStats._avg.rating).toFixed(2)) : 0,
    },
    meta: paginationMeta(total, page, limit),
  };
};
