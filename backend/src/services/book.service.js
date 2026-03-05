/**
 * Physical Book Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Full CRUD for physical books with:
 *   - Rich filtering: search, category, author, availability, page range
 *   - Computed rating stats on list AND detail
 *   - Availability tracking (copies vs available)
 *   - Admin-only writes + soft delete
 *   - Dashboard endpoints for admin and students
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build rating summary for a book from raw review aggregation data.
 * Returns average, total, and star distribution (1-5).
 */
const buildRatingSummary = async (field, bookId) => {
  const where = { [field]: bookId };

  const [agg, distribution] = await Promise.all([
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where,
      _count: { rating: true },
    }),
  ]);

  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((r) => { dist[r.rating] = r._count.rating; });

  return {
    average: agg._avg.rating ? parseFloat(Number(agg._avg.rating).toFixed(2)) : 0,
    total: agg._count.rating,
    distribution: dist,
  };
};

/**
 * Standard include block for a physical book list item.
 */
const BOOK_LIST_INCLUDE = {
  author: { select: { id: true, name: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: { sort_order: 'asc' },
    take: 3,
    select: { id: true, image_url: true, sort_order: true },
  },
  _count: { select: { rentals: true, reviews: true, wishlists: true } },
};

/**
 * Standard include block for a physical book detail view.
 */
const BOOK_DETAIL_INCLUDE = {
  author: { select: { id: true, name: true, bio: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sort_order: 'asc' } },
  _count: { select: { rentals: true, reviews: true, wishlists: true } },
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST BOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get paginated, searchable, filterable list of physical books.
 *
 * Supported query params:
 *   ?search=          – searches title, description, author name
 *   ?category_id=     – filter by category UUID
 *   ?author_id=       – filter by author UUID
 *   ?available=true   – only show books with available > 0
 *   ?min_pages=       – minimum page count
 *   ?max_pages=       – maximum page count
 *   ?sort=title|-title|available|-available|created_at (default: -created_at)
 *   ?page=1&limit=12
 *
 * Always excludes soft-deleted books.
 */
export const getBooks = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  // Build where clause dynamically
  const where = { deleted_at: null };

  // Category filter
  if (query.category_id) where.category_id = query.category_id;

  // Author filter
  if (query.author_id) where.author_id = query.author_id;

  // Availability filter
  if (query.available === 'true') where.available = { gt: 0 };
  if (query.available === 'false') where.available = 0;

  // Page range
  if (query.min_pages) where.pages = { ...where.pages, gte: parseInt(query.min_pages, 10) };
  if (query.max_pages) where.pages = { ...where.pages, lte: parseInt(query.max_pages, 10) };

  // Search (title + description + author name)
  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { author: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  // Sort – support -field for descending
  const ALLOWED_SORT_FIELDS = ['title', 'available', 'pages'];
  let orderBy = [{ title: 'asc' }];
  if (query.sort) {
    const desc = query.sort.startsWith('-');
    const field = desc ? query.sort.slice(1) : query.sort;
    if (ALLOWED_SORT_FIELDS.includes(field)) {
      orderBy = [{ [field]: desc ? 'desc' : 'asc' }];
    }
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: BOOK_LIST_INCLUDE,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  // Attach rating summaries for each book
  const booksWithRatings = await Promise.all(
    books.map(async (book) => ({
      ...book,
      rating: await buildRatingSummary('physical_book_id', book.id),
    }))
  );

  return {
    books: booksWithRatings,
    meta: paginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE BOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get full details for a single physical book including:
 *   - Full author and category info
 *   - All gallery images
 *   - Rating summary with distribution
 *   - Recent reviews (last 5)
 *   - Active rental status for the requesting user (if userId provided)
 *   - Wishlist status for the requesting user (if userId provided)
 */
export const getBookById = async (id, userId = null) => {
  const book = await prisma.book.findFirst({
    where: { id, deleted_at: null },
    include: {
      ...BOOK_DETAIL_INCLUDE,
      reviews: {
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!book) throw new AppError('Book not found', 404);

  const rating = await buildRatingSummary('physical_book_id', id);

  // Per-user context
  let userContext = null;
  if (userId) {
    const [activeRental, wishlistItem] = await Promise.all([
      prisma.rental.findFirst({
        where: { user_id: userId, book_id: id, status: { in: ['BORROWED', 'PENDING'] } },
        select: { id: true, status: true, due_date: true, loan_date: true },
      }),
      prisma.wishlist.findFirst({
        where: { user_id: userId, physical_book_id: id },
        select: { id: true },
      }),
    ]);
    userContext = {
      hasActiveRental: !!activeRental,
      activeRental,
      isInWishlist: !!wishlistItem,
      wishlistId: wishlistItem?.id || null,
    };
  }

  return { ...book, rating, userContext };
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE BOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new physical book.
 * All copies start as available.
 */
export const createBook = async (data) => {
  const { title, author_id, category_id, description, cover_image_url, copies, pages } = data;

  // Validate related records exist
  const [author, category] = await Promise.all([
    prisma.author.findUnique({ where: { id: author_id } }),
    prisma.category.findUnique({ where: { id: category_id } }),
  ]);
  if (!author) throw new AppError('Author not found', 404);
  if (!category) throw new AppError('Category not found', 404);

  const copiesInt = Math.max(1, parseInt(copies, 10));

  return prisma.book.create({
    data: {
      title: title.trim(),
      author_id,
      category_id,
      description: description.trim(),
      cover_image_url,
      copies: copiesInt,
      available: copiesInt, // all copies start available
      pages: parseInt(pages, 10),
    },
    include: BOOK_DETAIL_INCLUDE,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE BOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update book metadata.
 * If copies changes, recalculates available proportionally.
 */
export const updateBook = async (id, data) => {
  const book = await prisma.book.findFirst({ where: { id, deleted_at: null } });
  if (!book) throw new AppError('Book not found', 404);

  const updateData = {};

  if (data.title) updateData.title = data.title.trim();
  if (data.description) updateData.description = data.description.trim();
  if (data.cover_image_url) updateData.cover_image_url = data.cover_image_url;
  if (data.pages) updateData.pages = parseInt(data.pages, 10);

  // Update category only if it exists
  if (data.category_id) {
    const cat = await prisma.category.findUnique({ where: { id: data.category_id } });
    if (!cat) throw new AppError('Category not found', 404);
    updateData.category_id = data.category_id;
  }

  // Update author only if it exists
  if (data.author_id) {
    const auth = await prisma.author.findUnique({ where: { id: data.author_id } });
    if (!auth) throw new AppError('Author not found', 404);
    updateData.author_id = data.author_id;
  }

  // If copies is changing, adjust available accordingly
  if (data.copies !== undefined) {
    const newCopies = parseInt(data.copies, 10);
    if (newCopies < 0) throw new AppError('Copies cannot be negative', 400);
    const borrowed = book.copies - book.available;
    const newAvailable = Math.max(0, newCopies - borrowed);
    updateData.copies = newCopies;
    updateData.available = newAvailable;
  }

  return prisma.book.update({
    where: { id },
    data: updateData,
    include: BOOK_DETAIL_INCLUDE,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE BOOK (soft)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-delete a book.
 * Cannot delete if there are active rentals.
 */
export const deleteBook = async (id) => {
  const book = await prisma.book.findFirst({ where: { id, deleted_at: null } });
  if (!book) throw new AppError('Book not found', 404);

  const activeRentals = await prisma.rental.count({
    where: { book_id: id, status: { in: ['BORROWED', 'PENDING'] } },
  });
  if (activeRentals > 0) {
    throw new AppError(
      `Cannot delete: ${activeRentals} active rental(s) exist for this book`,
      409
    );
  }

  return prisma.book.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CHECK AVAILABILITY
// ─────────────────────────────────────────────────────────────────────────────

/** Get real-time availability status for a book. */
export const getBookAvailability = async (id) => {
  const book = await prisma.book.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      title: true,
      copies: true,
      available: true,
      _count: { select: { rentals: true } },
    },
  });
  if (!book) throw new AppError('Book not found', 404);

  const activeRentals = await prisma.rental.count({
    where: { book_id: id, status: { in: ['BORROWED', 'PENDING'] } },
  });

  return {
    id: book.id,
    title: book.title,
    totalCopies: book.copies,
    available: book.available,
    borrowed: activeRentals,
    isAvailable: book.available > 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET BOOKS FOR ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin book list with extra fields: soft-deleted books, exact counts, rental stats.
 * Supports showing deleted books with ?include_deleted=true
 */
export const getAdminBooks = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.include_deleted !== 'true') where.deleted_at = null;
  if (query.category_id) where.category_id = query.category_id;
  if (query.author_id) where.author_id = query.author_id;
  if (query.available === 'false') where.available = 0; // out of stock

  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { author: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const ALLOWED = ['title', 'available', 'copies'];
  let orderBy = [{ title: 'asc' }];
  if (query.sort) {
    const desc = query.sort.startsWith('-');
    const field = desc ? query.sort.slice(1) : query.sort;
    if (ALLOWED.includes(field)) orderBy = [{ [field]: desc ? 'desc' : 'asc' }];
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { rentals: true, reviews: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  return { books, meta: paginationMeta(total, page, limit) };
};
