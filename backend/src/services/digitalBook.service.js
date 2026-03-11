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

import { prisma } from "../prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { paginationMeta } from "../utils/apiFeatures.js";
import { uploadImageToCloudinary } from "../utils/cloudinary.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const createEmptyRatingSummary = () => ({
  average: 0,
  total: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
});

const buildRatingSummaries = async (ids) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const summaries = new Map(uniqueIds.map((id) => [id, createEmptyRatingSummary()]));
  if (uniqueIds.length === 0) return summaries;

  const where = { digital_book_id: { in: uniqueIds } };
  const [avgRows, distributionRows] = await Promise.all([
    prisma.review.groupBy({
      by: ["digital_book_id"],
      where,
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.review.groupBy({
      by: ["digital_book_id", "rating"],
      where,
      _count: { rating: true },
    }),
  ]);

  for (const row of avgRows) {
    const id = row.digital_book_id;
    if (!id) continue;
    const current = summaries.get(id) || createEmptyRatingSummary();
    current.average = row._avg.rating ? parseFloat(Number(row._avg.rating).toFixed(2)) : 0;
    current.total = row._count.rating;
    summaries.set(id, current);
  }

  for (const row of distributionRows) {
    const id = row.digital_book_id;
    if (!id) continue;
    const current = summaries.get(id) || createEmptyRatingSummary();
    current.distribution[row.rating] = row._count.rating;
    summaries.set(id, current);
  }

  return summaries;
};

const buildRatingSummary = async (bookId) => {
  const summaries = await buildRatingSummaries([bookId]);
  return summaries.get(bookId) || createEmptyRatingSummary();
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
  publication_year: true,
  tags: true,
  topics: true,
  deleted_at: true,
  author: { select: { id: true, name: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: /** @type {any} */ ({ sort_order: "asc" }),
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
  publication_year: true,
  tags: true,
  topics: true,
  deleted_at: true,
  author: { select: { id: true, name: true, bio: true, image: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: /** @type {any} */ ({ sort_order: "asc" }) },
  _count: { select: { reviews: true, wishlists: true } },
});

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

const DEFAULT_COVER_IMAGE = "https://placehold.co/400x600?text=Brana+Digital";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toTitleFromSlug = (value) =>
  decodeURIComponent(String(value || ""))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const digitalIdentifierWhere = (identifier) => {
  const raw = String(identifier || "").trim();
  if (!raw) return null;

  const slugTitle = toTitleFromSlug(raw);
  const or = [];

  if (UUID_V4_REGEX.test(raw)) {
    or.push({ id: raw });
  }

  if (slugTitle) {
    or.push({ title: { equals: slugTitle, mode: "insensitive" } });
    or.push({ title: { contains: slugTitle, mode: "insensitive" } });
  }

  if (or.length === 0) return null;
  return { deleted_at: null, OR: or };
};

const hasDigitalReadProgressModel = () => {
  return Boolean(prisma?.digitalReadProgress);
};

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const resolveAuthorId = async (data) => {
  if (data.author_id) {
    const author = await prisma.author.findUnique({ where: { id: data.author_id } });
    if (!author) throw new AppError("Author not found", 404);
    return data.author_id;
  }

  if (data.author_name?.trim()) {
    const normalizedName = data.author_name.trim();
    const existing = await prisma.author.findFirst({
      where: { name: { equals: normalizedName, mode: "insensitive" } },
    });
    if (existing) return existing.id;

    const created = await prisma.author.create({
      data: {
        name: normalizedName,
        bio: `Auto-created author profile for ${normalizedName}.`,
        image: "https://placehold.co/200x200?text=Author",
      },
    });
    return created.id;
  }

  throw new AppError("author_id or author_name is required", 400);
};

const resolveCategoryId = async (data) => {
  if (data.category_id) {
    const category = await prisma.category.findUnique({ where: { id: data.category_id } });
    if (!category) throw new AppError("Category not found", 404);
    return data.category_id;
  }

  if (data.category_name?.trim()) {
    const normalizedName = data.category_name.trim();
    const slug = normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: { equals: normalizedName, mode: "insensitive" } }, { slug }],
      },
    });
    if (existing) return existing.id;

    const created = await prisma.category.create({
      data: { name: normalizedName, slug },
    });
    return created.id;
  }

  throw new AppError("category_id or category_name is required", 400);
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
  const validAccess = ["FREE", "PAID", "RESTRICTED"];
  if (query.pdf_access && validAccess.includes(query.pdf_access.toUpperCase())) {
    where.pdf_access = query.pdf_access.toUpperCase();
  }

  if (query.min_pages) where.pages = { ...where.pages, gte: parseInt(query.min_pages, 10) };
  if (query.max_pages) where.pages = { ...where.pages, lte: parseInt(query.max_pages, 10) };
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

  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { author: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  // Note: DigitalBook has no created_at – default sort by id desc (insertion order)
  const ALLOWED = ["title", "pages", "pdf_access", "id"];
  let orderBy = /** @type {any} */ ([{ id: "desc" }]);
  if (query.sort) {
    const desc = query.sort.startsWith("-");
    const field = desc ? query.sort.slice(1) : query.sort;
    if (ALLOWED.includes(field)) orderBy = [{ [field]: desc ? "desc" : "asc" }];
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

  if (query.min_rating) {
    const min = parseFloat(query.min_rating);
    if (!Number.isNaN(min)) {
      const qualified = await prisma.review.groupBy({
        by: ["digital_book_id"],
        where: { digital_book_id: { not: null } },
        _avg: { rating: true },
      });
      const allowed = new Set(
        qualified.filter((row) => Number(row._avg.rating ?? 0) >= min).map((row) => row.digital_book_id),
      );
      const filtered = books.filter((b) => allowed.has(b.id));
      const ratingSummaries = await buildRatingSummaries(filtered.map((book) => book.id));
      const booksWithRatings = filtered.map((book) => ({
        ...book,
        rating: ratingSummaries.get(book.id) || createEmptyRatingSummary(),
      }));
      return { books: booksWithRatings, meta: paginationMeta(booksWithRatings.length, page, limit) };
    }
  }

  const ratingSummaries = await buildRatingSummaries(books.map((book) => book.id));
  const booksWithRatings = books.map((book) => ({
    ...book,
    rating: ratingSummaries.get(book.id) || createEmptyRatingSummary(),
  }));

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
  const where = digitalIdentifierWhere(id);
  if (!where) throw new AppError("Digital book not found", 404);

  const book = await prisma.digitalBook.findFirst({
    where,
    select: {
      ...DIGITAL_DETAIL_SELECT,
      reviews: {
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!book) throw new AppError("Digital book not found", 404);

  const rating = await buildRatingSummary(book.id);

  let userContext = null;
  if (userId) {
    const [wishlistItem, readProgress] = await Promise.all([
      prisma.wishlist.findFirst({
        where: { user_id: userId, digital_book_id: book.id },
        select: { id: true },
      }),
      hasDigitalReadProgressModel()
        ? prisma.digitalReadProgress.findUnique({
            where: {
              user_id_digital_book_id: {
                user_id: userId,
                digital_book_id: book.id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    userContext = {
      isInWishlist: !!wishlistItem,
      wishlistId: wishlistItem?.id || null,
      hasRead: !!readProgress,
    };
  }

  return { ...book, rating, userContext };
};

export const getDigitalBookPageData = async (id, userId = null) => {
  const book = await getDigitalBookById(id, userId);

  const [myReview, physicalByAuthor, digitalByAuthor] = await Promise.all([
    userId
      ? prisma.review.findFirst({
          where: { user_id: userId, digital_book_id: book.id },
          select: { id: true, rating: true, comment: true },
        })
      : Promise.resolve(null),
    prisma.book.findMany({
      where: {
        deleted_at: null,
        author_id: book.author.id,
      },
      select: RELATED_PHYSICAL_SELECT,
      take: 12,
      orderBy: { title: "asc" },
    }),
    prisma.digitalBook.findMany({
      where: {
        deleted_at: null,
        author_id: book.author.id,
        id: { not: book.id },
      },
      select: RELATED_DIGITAL_SELECT,
      take: 12,
      orderBy: { title: "asc" },
    }),
  ]);

  let related = [
    ...physicalByAuthor.map((item) => ({ ...item, type: "physical" })),
    ...digitalByAuthor.map((item) => ({ ...item, type: "digital" })),
  ].slice(0, 8);
  let relatedSource = "author";

  if (related.length === 0) {
    const [physicalByCategory, digitalByCategory] = await Promise.all([
      prisma.book.findMany({
        where: {
          deleted_at: null,
          category_id: book.category.id,
        },
        select: RELATED_PHYSICAL_SELECT,
        take: 12,
        orderBy: { title: "asc" },
      }),
      prisma.digitalBook.findMany({
        where: {
          deleted_at: null,
          category_id: book.category.id,
          id: { not: id },
        },
        select: RELATED_DIGITAL_SELECT,
        take: 12,
        orderBy: { title: "asc" },
      }),
    ]);
    related = [
      ...physicalByCategory.map((item) => ({ ...item, type: "physical" })),
      ...digitalByCategory.map((item) => ({ ...item, type: "digital" })),
    ].slice(0, 8);
    relatedSource = "category";
  }

  return { book, myReview, related, relatedSource };
};

export const markDigitalBookAsRead = async (id, userId) => {
  if (!hasDigitalReadProgressModel()) {
    // If Prisma client is not regenerated yet, avoid runtime crash and allow reading.
    return;
  }

  const where = digitalIdentifierWhere(id);
  if (!where) throw new AppError("Digital book not found", 404);

  const book = await prisma.digitalBook.findFirst({
    where,
    select: { id: true },
  });
  if (!book) throw new AppError("Digital book not found", 404);

  const now = new Date();
  await prisma.digitalReadProgress.upsert({
    where: {
      user_id_digital_book_id: {
        user_id: userId,
        digital_book_id: book.id,
      },
    },
    create: {
      user_id: userId,
      digital_book_id: book.id,
      first_read_at: now,
      last_read_at: now,
      read_count: 1,
    },
    update: {
      last_read_at: now,
      read_count: { increment: 1 },
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// STREAM PDF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the raw PDF bytes and filename for streaming.
 * Access control:
 *   FREE/PAID/RESTRICTED – any authenticated user can read inline
 *   Download permission is limited for RESTRICTED (admin only)
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
  if (!book) throw new AppError("Digital book not found", 404);
  if (!book.pdf_file) throw new AppError("PDF file not available", 404);

  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  const isAdmin = roles.includes("ADMIN");

  // Students can read all uploaded PDFs inline. Restriction applies to download capability.
  const canDownload = book.pdf_access !== "RESTRICTED" || isAdmin;

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
export const createDigitalBook = async (data, pdfFile = null, imageFile = null, galleryFiles = []) => {
  const title = data.title?.trim();
  if (!title) throw new AppError("title is required", 400);

  if (!pdfFile) throw new AppError("PDF file is required", 400);

  const [author_id, category_id] = await Promise.all([resolveAuthorId(data), resolveCategoryId(data)]);

  const validAccess = ["FREE", "PAID", "RESTRICTED"];
  const access = data.pdf_access?.toUpperCase() || "FREE";
  if (!validAccess.includes(access)) throw new AppError("Invalid pdf_access value", 400);
  const coverFromUpload = await uploadImageToCloudinary(imageFile, {
    folder: "brana/digital-books/covers",
  });
  const pagesInt = Math.max(1, parseInt(data.pages, 10) || 100);
  const description = data.description?.trim() || "No description provided.";
  const tags = parseList(data.tags);
  const topics = parseList(data.topics);

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
      publication_year: data.publication_year ? parseInt(data.publication_year, 10) : null,
      tags,
      topics,
    },
    select: DIGITAL_DETAIL_SELECT,
  });

  if (coverFromUpload) {
    await prisma.bookImage.create({
      data: {
        book_id: created.id,
        book_type: "DIGITAL",
        image_url: coverFromUpload,
        sort_order: 1,
        digital_book_id: created.id,
      },
    });
  }

  if (galleryFiles.length > 0) {
    const galleryUrls = await Promise.all(
      galleryFiles.map((file) =>
        uploadImageToCloudinary(file, {
          folder: "brana/digital-books/gallery",
        }),
      ),
    );

    await prisma.bookImage.createMany({
      data: galleryUrls.map((url, idx) => ({
        book_id: created.id,
        book_type: "DIGITAL",
        image_url: url,
        sort_order: (coverFromUpload ? 2 : 1) + idx,
        digital_book_id: created.id,
      })),
    });
  }

  return created;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export const updateDigitalBook = async (id, data, pdfFile = null, imageFile = null, galleryFiles = []) => {
  const book = await prisma.digitalBook.findFirst({ where: { id, deleted_at: null } });
  if (!book) throw new AppError("Digital book not found", 404);

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
      folder: "brana/digital-books/covers",
    });
    updateData.cover_image_url = uploadedCover;
  }

  if (data.pdf_access) {
    const validAccess = ["FREE", "PAID", "RESTRICTED"];
    const access = data.pdf_access.toUpperCase();
    if (!validAccess.includes(access)) throw new AppError("Invalid pdf_access value", 400);
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
      where: { digital_book_id: id, book_type: "DIGITAL" },
      orderBy: { sort_order: "desc" },
      select: { sort_order: true },
    });

    await prisma.bookImage.create({
      data: {
        book_id: id,
        book_type: "DIGITAL",
        image_url: uploadedCover,
        sort_order: (lastImage?.sort_order ?? 0) + 1,
        digital_book_id: id,
      },
    });
  }

  if (galleryFiles.length > 0) {
    const galleryUrls = await Promise.all(
      galleryFiles.map((file) =>
        uploadImageToCloudinary(file, {
          folder: "brana/digital-books/gallery",
        }),
      ),
    );

    const lastImage = await prisma.bookImage.findFirst({
      where: { digital_book_id: id, book_type: "DIGITAL" },
      orderBy: { sort_order: "desc" },
      select: { sort_order: true },
    });

    await prisma.bookImage.createMany({
      data: galleryUrls.map((url, idx) => ({
        book_id: id,
        book_type: "DIGITAL",
        image_url: url,
        sort_order: (lastImage?.sort_order ?? 0) + idx + 1,
        digital_book_id: id,
      })),
    });
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (soft)
// ─────────────────────────────────────────────────────────────────────────────

export const deleteDigitalBook = async (id) => {
  const book = await prisma.digitalBook.findFirst({ where: { id, deleted_at: null } });
  if (!book) throw new AppError("Digital book not found", 404);
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
  if (query.include_deleted !== "true") where.deleted_at = null;
  if (query.category_id) where.category_id = query.category_id;
  if (query.author_id) where.author_id = query.author_id;
  if (query.pdf_access) where.pdf_access = query.pdf_access.toUpperCase();

  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [books, total] = await Promise.all([
    prisma.digitalBook.findMany({
      where,
      select: DIGITAL_LIST_SELECT,
      orderBy: /** @type {any} */ ({ id: "desc" }),
      skip,
      take: limit,
    }),
    prisma.digitalBook.count({ where }),
  ]);

  return { books, meta: paginationMeta(total, page, limit) };
};
