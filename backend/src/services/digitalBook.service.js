/**
 * Digital Book Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages digital (PDF) books with:
 *   - PDF stored as Bytes in DB (BYTEA via Prisma)
 *   - Streaming PDF to authorized users
 *   - PDF access control: FREE | PAID | RESTRICTED
 *   - Rating and review summaries
 *   - User wishlist / read-state context
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const buildRatingSummary = async (bookId) => {
  const where = { digital_book_id: bookId };

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

/** Select fields for list view – NEVER include pdf_file bytes in lists */
const DIGITAL_LIST_SELECT = /** @type {any} */ ({
  id: true,
  title: true,
  description: true,
  cover_image_url: true,
  pdf_name: true,
  pdf_access: true,
  pages: true,
  deleted_at: true,
  author: { select: { id: true, name: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: /** @type {any} */ ({ sort_order: 'asc' }),
    take: 3,
    select: { id: true, image_url: true },
  },
  _count: { select: { reviews: true, wishlists: true } },
});

const DIGITAL_DETAIL_SELECT = /** @type {any} */ ({
  id: true,
  title: true,
  description: true,
  cover_image_url: true,
  pdf_name: true,
  pdf_access: true,
  pages: true,
  deleted_at: true,
  author: { select: { id: true, name: true, bio: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: /** @type {any} */ ({ sort_order: 'asc' }) },
  _count: { select: { reviews: true, wishlists: true } },
});

const DEFAULT_COVER_IMAGE = 'https://placehold.co/400x600?text=Brana+Digital';

const resolveAuthorId = async (data) => {
  if (data.author_id) {
    const author = await prisma.author.findUnique({ where: { id: data.author_id } });
    if (!author) throw new AppError('Author not found', 404);
    return data.author_id;
  }

  if (data.author_name?.trim()) {
    const normalizedName = data.author_name.trim();
    const existing = await prisma.author.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing) return existing.id;

    const created = await prisma.author.create({
      data: {
        name: normalizedName,
        bio: `Auto-created author profile for ${normalizedName}.`,
        image: 'https://placehold.co/200x200?text=Author',
      },
    });
    return created.id;
  }

  throw new AppError('author_id or author_name is required', 400);
};

const resolveCategoryId = async (data) => {
  if (data.category_id) {
    const category = await prisma.category.findUnique({ where: { id: data.category_id } });
    if (!category) throw new AppError('Category not found', 404);
    return data.category_id;
  }

  if (data.category_name?.trim()) {
    const normalizedName = data.category_name.trim();
    const slug = normalizedName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: normalizedName, mode: 'insensitive' } },
          { slug },
        ],
      },
    });
    if (existing) return existing.id;

    const created = await prisma.category.create({
      data: { name: normalizedName, slug },
    });
    return created.id;
  }

  throw new AppError('category_id or category_name is required', 400);
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST DIGITAL BOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated digital book list.
 *
 * Query params:
 *   ?search=             – title, description, author name
 *   ?category_id=
 *   ?author_id=
 *   ?pdf_access=FREE|PAID|RESTRICTED
 *   ?min_pages=&max_pages=
 *   ?sort=title|pages|created_at (prefix - for desc)
 *   ?page=1&limit=12
 */
export const getDigitalBooks = async (query, _requestUser = null) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const where = /** @type {any} */ ({ deleted_at: null });

  if (query.category_id) where.category_id = query.category_id;
  if (query.author_id) where.author_id = query.author_id;

  // PDF access type filter
  const validAccess = ['FREE', 'PAID', 'RESTRICTED'];
  if (query.pdf_access && validAccess.includes(query.pdf_access.toUpperCase())) {
    where.pdf_access = query.pdf_access.toUpperCase();
  }

  if (query.min_pages) where.pages = { ...where.pages, gte: parseInt(query.min_pages, 10) };
  if (query.max_pages) where.pages = { ...where.pages, lte: parseInt(query.max_pages, 10) };

  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { author: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  // Note: DigitalBook has no created_at – default sort by id desc (insertion order)
  const ALLOWED = ['title', 'pages', 'pdf_access', 'id'];
  let orderBy = /** @type {any} */ ([{ id: 'desc' }]);
  if (query.sort) {
    const desc = query.sort.startsWith('-');
    const field = desc ? query.sort.slice(1) : query.sort;
    if (ALLOWED.includes(field)) orderBy = [{ [field]: desc ? 'desc' : 'asc' }];
  }

  const [books, total] = await Promise.all([
    prisma.digitalBook.findMany({
      where,
      select: DIGITAL_LIST_SELECT,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.digitalBook.count({ where }),
  ]);

  const booksWithRatings = await Promise.all(
    books.map(async (book) => ({
      ...book,
      rating: await buildRatingSummary(book.id),
    }))
  );

  return { books: booksWithRatings, meta: paginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE DIGITAL BOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get full detail of a digital book.
 * Includes ratings, 5 most recent reviews, and per-user context (wishlist).
 * Does NOT include pdf_file bytes.
 */
export const getDigitalBookById = async (id, userId = null) => {
  const book = await prisma.digitalBook.findFirst({
    where: { id, deleted_at: null },
    select: {
      ...DIGITAL_DETAIL_SELECT,
      reviews: {
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true, rating: true, comment: true, created_at: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!book) throw new AppError('Digital book not found', 404);

  const rating = await buildRatingSummary(id);

  let userContext = null;
  if (userId) {
    const wishlistItem = await prisma.wishlist.findFirst({
      where: { user_id: userId, digital_book_id: id },
      select: { id: true },
    });
    userContext = {
      isInWishlist: !!wishlistItem,
      wishlistId: wishlistItem?.id || null,
      // For PAID/RESTRICTED, can check if user has a completed payment
      // (future: when we add digital book payments)
    };
  }

  return { ...book, rating, userContext };
};

// ─────────────────────────────────────────────────────────────────────────────
// STREAM PDF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the raw PDF bytes and filename for streaming.
 * Access control:
 *   FREE   – any authenticated user can download
 *   PAID   – only users who have a SUCCESS payment linked to this book (future)
 *   RESTRICTED – admin only
 */
export const getPdfBytes = async (id, user) => {
  const book = await prisma.digitalBook.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      title: true,
      pdf_file: true,
      pdf_name: true,
      pdf_access: true,
    },
  });
  if (!book) throw new AppError('Digital book not found', 404);
  if (!book.pdf_file) throw new AppError('PDF file not available', 404);

  // Access control
  if (book.pdf_access === 'RESTRICTED' && user.role !== 'ADMIN') {
    throw new AppError('Access restricted. Contact library admin.', 403);
  }

  if (book.pdf_access === 'PAID' && user.role !== 'ADMIN') {
    // Future: check payment here
    // For now, allow authenticated students
    // throw new AppError('This PDF requires a paid subscription', 402);
  }

  const canDownload = book.pdf_access !== 'RESTRICTED' || user.role === 'ADMIN';

  return {
    bytes: book.pdf_file,
    fileName: book.pdf_name || `${book.title}.pdf`,
    canDownload,
    access: book.pdf_access,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a digital book with PDF file.
 * Accepts uploaded PDF via multer (buffer stored as BYTEA).
 */
export const createDigitalBook = async (data, pdfFile = null, imageFile = null) => {
  const title = data.title?.trim();
  if (!title) throw new AppError('title is required', 400);

  if (!pdfFile) throw new AppError('PDF file is required', 400);

  const [author_id, category_id] = await Promise.all([
    resolveAuthorId(data),
    resolveCategoryId(data),
  ]);

  const validAccess = ['FREE', 'PAID', 'RESTRICTED'];
  const access = data.pdf_access?.toUpperCase() || 'FREE';
  if (!validAccess.includes(access)) throw new AppError('Invalid pdf_access value', 400);
  const coverFromUpload = await uploadImageToCloudinary(imageFile, {
    folder: 'brana/digital-books/covers',
  });
  const pagesInt = Math.max(1, parseInt(data.pages, 10) || 100);
  const description = data.description?.trim() || 'No description provided.';

  const created = await prisma.digitalBook.create({
    data: {
      title,
      author_id,
      category_id,
      description,
      cover_image_url: coverFromUpload || data.cover_image_url || DEFAULT_COVER_IMAGE,
      pdf_file: pdfFile.buffer,
      pdf_name: pdfFile.originalname,
      pdf_access: /** @type {any} */ (access),
      pages: pagesInt,
    },
    select: DIGITAL_DETAIL_SELECT,
  });

  if (coverFromUpload) {
    await prisma.bookImage.create({
      data: {
        book_id: created.id,
        book_type: 'DIGITAL',
        image_url: coverFromUpload,
        sort_order: 1,
        digital_book_id: created.id,
      },
    });
  }

  return created;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export const updateDigitalBook = async (id, data, pdfFile = null, imageFile = null) => {
  const book = await prisma.digitalBook.findFirst({ where: { id, deleted_at: null } });
  if (!book) throw new AppError('Digital book not found', 404);

  const updateData = {};
  if (data.title) updateData.title = data.title.trim();
  if (data.description) updateData.description = data.description.trim();
  if (data.cover_image_url) updateData.cover_image_url = data.cover_image_url;
  if (data.pages) updateData.pages = parseInt(data.pages, 10);
  let uploadedCover = null;
  if (imageFile) {
    uploadedCover = await uploadImageToCloudinary(imageFile, {
      folder: 'brana/digital-books/covers',
    });
    updateData.cover_image_url = uploadedCover;
  }

  if (data.pdf_access) {
    const validAccess = ['FREE', 'PAID', 'RESTRICTED'];
    const access = data.pdf_access.toUpperCase();
    if (!validAccess.includes(access)) throw new AppError('Invalid pdf_access value', 400);
    updateData.pdf_access = /** @type {any} */ (access);
  }

  if (data.category_id || data.category_name) {
    updateData.category_id = await resolveCategoryId(data);
  }

  if (data.author_id || data.author_name) {
    updateData.author_id = await resolveAuthorId(data);
  }

  if (pdfFile) {
    updateData.pdf_file = pdfFile.buffer;
    updateData.pdf_name = pdfFile.originalname;
  }

  const updated = await prisma.digitalBook.update({
    where: { id },
    data: updateData,
    select: DIGITAL_DETAIL_SELECT,
  });

  if (uploadedCover) {
    const lastImage = await prisma.bookImage.findFirst({
      where: { digital_book_id: id, book_type: 'DIGITAL' },
      orderBy: { sort_order: 'desc' },
      select: { sort_order: true },
    });

    await prisma.bookImage.create({
      data: {
        book_id: id,
        book_type: 'DIGITAL',
        image_url: uploadedCover,
        sort_order: (lastImage?.sort_order ?? 0) + 1,
        digital_book_id: id,
      },
    });
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (soft)
// ─────────────────────────────────────────────────────────────────────────────

export const deleteDigitalBook = async (id) => {
  const book = await prisma.digitalBook.findFirst({ where: { id, deleted_at: null } });
  if (!book) throw new AppError('Digital book not found', 404);
  return prisma.digitalBook.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: ADMIN DASHBOARD LIST
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminDigitalBooks = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = /** @type {any} */ ({});
  if (query.include_deleted !== 'true') where.deleted_at = null;
  if (query.category_id) where.category_id = query.category_id;
  if (query.author_id) where.author_id = query.author_id;
  if (query.pdf_access) where.pdf_access = query.pdf_access.toUpperCase();

  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { author: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [books, total] = await Promise.all([
    prisma.digitalBook.findMany({
      where,
      select: DIGITAL_LIST_SELECT,
      orderBy: /** @type {any} */ ({ id: 'desc' }),
      skip,
      take: limit,
    }),
    prisma.digitalBook.count({ where }),
  ]);

  return { books, meta: paginationMeta(total, page, limit) };
};
