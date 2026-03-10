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
import { syncLowStockAlertForBook } from './inventoryAlert.service.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

const RATING_CACHE_TTL_MS = 60 * 1000;
const ratingCache = new Map();

const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of ratingCache.entries()) {
    if (now - value.timestamp > RATING_CACHE_TTL_MS) {
      ratingCache.delete(key);
    }
  }
};

setInterval(clearExpiredCache, 5 * 60 * 1000);

const createEmptyRatingSummary = () => ({
  average: 0,
  total: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
});

const buildRatingSummaries = async (field, ids) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const uncachedIds = [];
  const summaries = new Map();

  for (const id of uniqueIds) {
    const cacheKey = `${field}:${id}`;
    const cached = ratingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < RATING_CACHE_TTL_MS) {
      summaries.set(id, cached.data);
    } else {
      uncachedIds.push(id);
      summaries.set(id, createEmptyRatingSummary());
    }
  }

  if (uncachedIds.length > 0) {
    const where = { [field]: { in: uncachedIds } };
    const [avgRows, distributionRows] = await Promise.all([
      prisma.review.groupBy({
        by: [field],
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.review.groupBy({
        by: [field, 'rating'],
        where,
        _count: { rating: true },
      }),
    ]);

    for (const row of avgRows) {
      const id = row[field];
      if (!id) continue;
      const current = summaries.get(id) || createEmptyRatingSummary();
      current.average = row._avg.rating ? parseFloat(Number(row._avg.rating).toFixed(2)) : 0;
      current.total = row._count.rating;
      summaries.set(id, current);
      ratingCache.set(`${field}:${id}`, { data: current, timestamp: Date.now() });
    }

    for (const row of distributionRows) {
      const id = row[field];
      if (!id) continue;
      const current = summaries.get(id) || createEmptyRatingSummary();
      current.distribution[row.rating] = row._count.rating;
      summaries.set(id, current);
      const cached = ratingCache.get(`${field}:${id}`);
      if (cached) cached.data = current;
    }
  }

  return summaries;
};

const buildRatingSummary = async (field, bookId) => {
  const summaries = await buildRatingSummaries(field, [bookId]);
  return summaries.get(bookId) || createEmptyRatingSummary();
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

const RELATED_PHYSICAL_SELECT = {
  id: true,
  title: true,
  cover_image_url: true,
};

const RELATED_DIGITAL_SELECT = {
  id: true,
  title: true,
  cover_image_url: true,
};

const DEFAULT_COVER_IMAGE = 'https://placehold.co/400x600?text=Brana+Book';
const ASYNC_BOOK_IMAGE_UPLOADS = process.env.ASYNC_BOOK_IMAGE_UPLOADS !== 'false';

const runAsyncTask = (label, task) => {
  setImmediate(() => {
    void task().catch((error) => {
      console.error(`[BookService:${label}]`, error?.message || error);
    });
  });
};

const uploadBookImageAssets = async (coverFile, galleryFiles = []) => {
  const [coverUrl, galleryUrlsRaw] = await Promise.all([
    coverFile
      ? uploadImageToCloudinary(coverFile, {
          folder: 'brana/physical-books/covers',
        })
      : Promise.resolve(null),
    galleryFiles.length > 0
      ? Promise.all(
          galleryFiles.map((file) =>
            uploadImageToCloudinary(file, {
              folder: 'brana/physical-books/gallery',
            }),
          ),
        )
      : Promise.resolve([]),
  ]);

  return {
    coverUrl,
    galleryUrls: galleryUrlsRaw.filter(Boolean),
  };
};

const persistBookImages = async ({ bookId, coverUrl = null, galleryUrls = [], updateBookCover = false }) => {
  let nextSortOrder = 1;

  if (coverUrl) {
    if (updateBookCover) {
      await prisma.book.update({
        where: { id: bookId },
        data: { cover_image_url: coverUrl },
      });
    }

    await prisma.bookImage.create({
      data: {
        book_id: bookId,
        book_type: 'PHYSICAL',
        image_url: coverUrl,
        sort_order: 1,
        physical_book_id: bookId,
      },
    });
    nextSortOrder = 2;
  } else {
    const lastImage = await prisma.bookImage.findFirst({
      where: { physical_book_id: bookId, book_type: 'PHYSICAL' },
      orderBy: { sort_order: 'desc' },
      select: { sort_order: true },
    });
    nextSortOrder = (lastImage?.sort_order ?? 0) + 1;
  }

  if (galleryUrls.length > 0) {
    await prisma.bookImage.createMany({
      data: galleryUrls.map((url, idx) => ({
        book_id: bookId,
        book_type: 'PHYSICAL',
        image_url: url,
        sort_order: nextSortOrder + idx,
        physical_book_id: bookId,
      })),
    });
  }
};

const scheduleBookImageProcessing = (bookId, coverFile, galleryFiles = []) => {
  if (!coverFile && galleryFiles.length === 0) return;

  runAsyncTask('create-book-images', async () => {
    const { coverUrl, galleryUrls } = await uploadBookImageAssets(coverFile, galleryFiles);
    await persistBookImages({
      bookId,
      coverUrl,
      galleryUrls,
      updateBookCover: Boolean(coverUrl),
    });
  });
};

const buildCopyCode = (bookId, sequence) => {
  const seq = String(sequence).padStart(4, '0');
  return `BC-${bookId.slice(0, 8).toUpperCase()}-${seq}`;
};

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

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

  if (query.year) {
    const year = parseInt(query.year, 10);
    if (!isNaN(year)) where.publication_year = year;
  }
  if (query.year_from || query.year_to) {
    where.publication_year = {};
    if (query.year_from) where.publication_year.gte = parseInt(query.year_from, 10);
    if (query.year_to) where.publication_year.lte = parseInt(query.year_to, 10);
  }

  const tags = parseList(query.tags);
  const topics = parseList(query.topics);
  if (tags.length > 0) where.tags = { hasSome: tags };
  if (topics.length > 0) where.topics = { hasSome: topics };

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

  if (query.min_rating) {
    const min = parseFloat(query.min_rating);
    if (!Number.isNaN(min)) {
      const qualified = await prisma.review.groupBy({
        by: ['physical_book_id'],
        where: { physical_book_id: { not: null } },
        _avg: { rating: true },
      });
      const allowedIds = new Set(
        qualified
          .filter((row) => Number(row._avg.rating ?? 0) >= min)
          .map((row) => row.physical_book_id),
      );
      const filtered = books.filter((b) => allowedIds.has(b.id));
      const ratingSummaries = await buildRatingSummaries(
        'physical_book_id',
        filtered.map((book) => book.id),
      );
      const booksWithRatings = filtered.map((book) => ({
        ...book,
        rating: ratingSummaries.get(book.id) || createEmptyRatingSummary(),
      }));
      return {
        books: booksWithRatings,
        meta: paginationMeta(booksWithRatings.length, page, limit),
      };
    }
  }

  const ratingSummaries = await buildRatingSummaries(
    'physical_book_id',
    books.map((book) => book.id),
  );
  const booksWithRatings = books.map((book) => ({
    ...book,
    rating: ratingSummaries.get(book.id) || createEmptyRatingSummary(),
  }));

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

  console.log(`[DEBUG] Book ${id}: copies=${book.copies}, available=${book.available}`);

  if (book.available === null || book.available === undefined) {
    book.available = book.copies || 0;
    console.log(`[DEBUG] Fixed available for book ${id}: available=${book.available}`);
  }
  if (book.copies === null || book.copies === undefined || book.copies < 0) {
    book.copies = 1;
    console.log(`[DEBUG] Fixed copies for book ${id}: copies=${book.copies}`);
  }

  const rating = await buildRatingSummary('physical_book_id', id);

  console.log(`[DEBUG] Book ${id} has ${book.reviews?.length || 0} reviews`);

  // Get active reservation count for this book (QUEUED or NOTIFIED)
  const reservationCount = await prisma.reservation.count({
    where: { book_id: id, status: { in: ['QUEUED', 'NOTIFIED'] } },
  });

  // Check if current user has an active reservation
  let userReservation = null;
  if (userId) {
    userReservation = await prisma.reservation.findFirst({
      where: { user_id: userId, book_id: id, status: { in: ['QUEUED', 'NOTIFIED'] } },
      select: { id: true },
    });
    console.log(`[DEBUG] User ${userId} reservation for book ${id}:`, userReservation);
  }

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
    console.log(`[DEBUG] User ${userId} rental for book ${id}:`, activeRental);
    userContext = {
      hasActiveRental: !!activeRental,
      activeRental,
      isInWishlist: !!wishlistItem,
      wishlistId: wishlistItem?.id || null,
      hasActiveReservation: !!userReservation,
    };
  }

  return { ...book, rating, userContext, reservationCount };
};

export const getBookPageData = async (id, userId = null) => {
  const book = await getBookById(id, userId);

  const [myReview, physicalByAuthor, digitalByAuthor] = await Promise.all([
    userId
      ? prisma.review.findFirst({
          where: { user_id: userId, physical_book_id: id },
          select: { id: true, rating: true, comment: true },
        })
      : Promise.resolve(null),
    prisma.book.findMany({
      where: {
        deleted_at: null,
        author_id: book.author.id,
        id: { not: id },
      },
      select: RELATED_PHYSICAL_SELECT,
      take: 12,
      orderBy: { title: 'asc' },
    }),
    prisma.digitalBook.findMany({
      where: {
        deleted_at: null,
        author_id: book.author.id,
      },
      select: RELATED_DIGITAL_SELECT,
      take: 12,
      orderBy: { title: 'asc' },
    }),
  ]);

  let related = [
    ...physicalByAuthor.map((item) => ({ ...item, type: 'physical' })),
    ...digitalByAuthor.map((item) => ({ ...item, type: 'digital' })),
  ].slice(0, 8);
  let relatedSource = 'author';

  if (related.length === 0) {
    const [physicalByCategory, digitalByCategory] = await Promise.all([
      prisma.book.findMany({
        where: {
          deleted_at: null,
          category_id: book.category.id,
          id: { not: id },
        },
        select: RELATED_PHYSICAL_SELECT,
        take: 12,
        orderBy: { title: 'asc' },
      }),
      prisma.digitalBook.findMany({
        where: {
          deleted_at: null,
          category_id: book.category.id,
        },
        select: RELATED_DIGITAL_SELECT,
        take: 12,
        orderBy: { title: 'asc' },
      }),
    ]);
    related = [
      ...physicalByCategory.map((item) => ({ ...item, type: 'physical' })),
      ...digitalByCategory.map((item) => ({ ...item, type: 'digital' })),
    ].slice(0, 8);
    relatedSource = 'category';
  }

  return { book, myReview, related, relatedSource };
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE BOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new physical book.
 * All copies start as available.
 */
export const createBook = async (data, imageFile = null, galleryFiles = []) => {
  const title = data.title?.trim();
  if (!title) throw new AppError('title is required', 400);

  const [author_id, category_id] = await Promise.all([
    resolveAuthorId(data),
    resolveCategoryId(data),
  ]);

  const copiesRaw = data.copies ?? data.total;
  const copiesInt = Math.max(1, parseInt(copiesRaw, 10) || 1);
  const pagesInt = Math.max(1, parseInt(data.pages, 10) || 100);
  const description = data.description?.trim() || 'No description provided.';
  const tags = parseList(data.tags);
  const topics = parseList(data.topics);
  const hasImages = Boolean(imageFile) || galleryFiles.length > 0;
  const useAsyncImagePipeline = ASYNC_BOOK_IMAGE_UPLOADS && hasImages;

  let coverFromUpload = null;
  let galleryUrls = [];
  if (!useAsyncImagePipeline && hasImages) {
    const uploaded = await uploadBookImageAssets(imageFile, galleryFiles);
    coverFromUpload = uploaded.coverUrl;
    galleryUrls = uploaded.galleryUrls;
  }

  const created = await prisma.book.create({
    data: {
      title,
      author_id,
      category_id,
      description,
      cover_image_url: coverFromUpload || data.cover_image_url || DEFAULT_COVER_IMAGE,
      copies: copiesInt,
      available: copiesInt, // all copies start available
      pages: pagesInt,
      publication_year: data.publication_year ? parseInt(data.publication_year, 10) : null,
      tags,
      topics,
    },
    include: BOOK_DETAIL_INCLUDE,
  });

  await prisma.bookCopy.createMany({
    data: Array.from({ length: copiesInt }).map((_, idx) => ({
      book_id: created.id,
      copy_code: buildCopyCode(created.id, idx + 1),
      is_available: true,
      condition: 'GOOD',
    })),
  });

  if (useAsyncImagePipeline) {
    scheduleBookImageProcessing(created.id, imageFile, galleryFiles);
  } else if (coverFromUpload || galleryUrls.length > 0) {
    await persistBookImages({
      bookId: created.id,
      coverUrl: coverFromUpload,
      galleryUrls,
      updateBookCover: false,
    });
  }

  runAsyncTask('sync-low-stock-after-create', async () => {
    await syncLowStockAlertForBook(created.id);
  });
  return created;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE BOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update book metadata.
 * If copies changes, recalculates available proportionally.
 */
export const updateBook = async (id, data, imageFile = null, galleryFiles = []) => {
  const book = await prisma.book.findFirst({ where: { id, deleted_at: null } });
  if (!book) throw new AppError('Book not found', 404);

  const updateData = {};

  if (data.title) updateData.title = data.title.trim();
  if (data.description) updateData.description = data.description.trim();
  if (data.cover_image_url) updateData.cover_image_url = data.cover_image_url;
  if (data.pages) updateData.pages = parseInt(data.pages, 10);
  if (data.publication_year !== undefined) {
    updateData.publication_year = data.publication_year ? parseInt(data.publication_year, 10) : null;
  }
  if (data.tags !== undefined) updateData.tags = parseList(data.tags);
  if (data.topics !== undefined) updateData.topics = parseList(data.topics);
  let uploadedCover = null;
  if (imageFile) {
    uploadedCover = await uploadImageToCloudinary(imageFile, {
      folder: 'brana/physical-books/covers',
    });
    updateData.cover_image_url = uploadedCover;
  }

  // Update category only if it exists
  if (data.category_id || data.category_name) {
    updateData.category_id = await resolveCategoryId(data);
  }

  // Update author only if it exists
  if (data.author_id || data.author_name) {
    updateData.author_id = await resolveAuthorId(data);
  }

  // If copies is changing, adjust available accordingly
  const copyInput = data.copies ?? data.total;
  if (copyInput !== undefined) {
    const newCopies = parseInt(copyInput, 10);
    if (newCopies < 0) throw new AppError('Copies cannot be negative', 400);
    const borrowed = book.copies - book.available;
    const newAvailable = Math.max(0, newCopies - borrowed);
    updateData.copies = newCopies;
    updateData.available = newAvailable;
  }

  const updated = await prisma.book.update({
    where: { id },
    data: updateData,
    include: BOOK_DETAIL_INCLUDE,
  });

  if (copyInput !== undefined) {
    const targetCopies = parseInt(copyInput, 10);
    const activeCopiesCount = await prisma.bookCopy.count({
      where: { book_id: id, deleted_at: null },
    });

    if (targetCopies > activeCopiesCount) {
      const toCreate = targetCopies - activeCopiesCount;
      const allCopiesCount = await prisma.bookCopy.count({
        where: { book_id: id },
      });
      await prisma.bookCopy.createMany({
        data: Array.from({ length: toCreate }).map((_, idx) => ({
          book_id: id,
          copy_code: buildCopyCode(id, allCopiesCount + idx + 1),
          is_available: true,
          condition: 'GOOD',
        })),
      });
    } else if (targetCopies < activeCopiesCount) {
      const toArchive = activeCopiesCount - targetCopies;
      const removable = await prisma.bookCopy.findMany({
        where: {
          book_id: id,
          deleted_at: null,
          is_available: true,
        },
        orderBy: { acquired_at: 'desc' },
        take: toArchive,
        select: { id: true },
      });
      if (removable.length < toArchive) {
        throw new AppError('Cannot reduce copies below currently borrowed copy count', 400);
      }
      await prisma.bookCopy.updateMany({
        where: { id: { in: removable.map((copy) => copy.id) } },
        data: { deleted_at: new Date() },
      });
    }
  }

  if (uploadedCover) {
    const lastImage = await prisma.bookImage.findFirst({
      where: { physical_book_id: id, book_type: 'PHYSICAL' },
      orderBy: { sort_order: 'desc' },
      select: { sort_order: true },
    });

    await prisma.bookImage.create({
      data: {
        book_id: id,
        book_type: 'PHYSICAL',
        image_url: uploadedCover,
        sort_order: (lastImage?.sort_order ?? 0) + 1,
        physical_book_id: id,
      },
    });
  }

  if (galleryFiles.length > 0) {
    const galleryUrls = await Promise.all(
      galleryFiles.map((file) =>
        uploadImageToCloudinary(file, {
          folder: 'brana/physical-books/gallery',
        }),
      ),
    );

    const lastImage = await prisma.bookImage.findFirst({
      where: { physical_book_id: id, book_type: 'PHYSICAL' },
      orderBy: { sort_order: 'desc' },
      select: { sort_order: true },
    });

    await prisma.bookImage.createMany({
      data: galleryUrls.map((url, idx) => ({
        book_id: id,
        book_type: 'PHYSICAL',
        image_url: url,
        sort_order: (lastImage?.sort_order ?? 0) + idx + 1,
        physical_book_id: id,
      })),
    });
  }

  await syncLowStockAlertForBook(id);
  return updated;
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

  const result = await prisma.book.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
  await prisma.bookCopy.updateMany({
    where: { book_id: id, deleted_at: null },
    data: { deleted_at: new Date(), is_available: false },
  });
  await syncLowStockAlertForBook(id);
  return result;
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

export const getBookCopies = async (bookId) => {
  const copies = await prisma.bookCopy.findMany({
    where: { book_id: bookId, deleted_at: null },
    orderBy: { copy_code: 'asc' },
    select: {
      id: true,
      copy_code: true,
      condition: true,
      is_available: true,
      last_condition_update: true,
      notes: true,
      rentals: {
        where: { status: { in: ['BORROWED', 'PENDING'] } },
        select: { id: true, user: { select: { id: true, name: true, email: true } } },
        take: 1,
      },
    },
  });
  return copies;
};

export const updateBookCopyCondition = async (copyId, { condition, notes }, adminUserId) => {
  const valid = ['NEW', 'GOOD', 'WORN', 'DAMAGED', 'LOST'];
  const next = String(condition || '').toUpperCase();
  if (!valid.includes(next)) throw new AppError('Invalid condition value', 400);

  const copy = await prisma.bookCopy.findUnique({
    where: { id: copyId },
    select: { id: true, condition: true, notes: true },
  });
  if (!copy) throw new AppError('Book copy not found', 404);
  if (copy.condition === next && (notes ?? copy.notes) === copy.notes) return copy;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCopy = await tx.bookCopy.update({
      where: { id: copyId },
      data: {
        condition: next,
        notes: notes ?? copy.notes,
        last_condition_update: new Date(),
        ...(next === 'LOST'
          ? { is_available: false }
          : {}),
      },
      select: {
        id: true,
        book_id: true,
        copy_code: true,
        condition: true,
        notes: true,
        is_available: true,
        last_condition_update: true,
      },
    });
    await tx.bookConditionHistory.create({
      data: {
        copy_id: copyId,
        old_condition: copy.condition,
        new_condition: next,
        notes: notes ?? null,
        updated_by_user_id: adminUserId,
      },
    });
    return updatedCopy;
  });

  return updated;
};

export const getBookConditionHistory = async (copyId) => {
  return prisma.bookConditionHistory.findMany({
    where: { copy_id: copyId },
    orderBy: { created_at: 'desc' },
    include: {
      updated_by_user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
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
