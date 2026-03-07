/**
 * Author Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Full CRUD with:
 *   - Book count and digital book count per author
 *   - Author search
 *   - Author profile with all books listed
 *   - Image upload support
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

// ─────────────────────────────────────────────────────────────────────────────
// LIST AUTHORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated list of authors.
 *
 * Query params:
 *   ?search=       – search by name or bio
 *   ?sort=name|-name|books (default: name asc)
 *   ?page=1&limit=20
 */
export const getAuthors = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { bio: { contains: q, mode: 'insensitive' } },
    ];
  }

  const ALLOWED = ['name', 'created_at'];
  let orderBy = [{ name: 'asc' }];
  if (query.sort) {
    const desc = query.sort.startsWith('-');
    const field = desc ? query.sort.slice(1) : query.sort;
    if (ALLOWED.includes(field)) orderBy = [{ [field]: desc ? 'desc' : 'asc' }];
  }

  const [authors, total] = await Promise.all([
    prisma.author.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        _count: { select: { books: true, digital_books: true } },
      },
    }),
    prisma.author.count({ where }),
  ]);

  return { authors, meta: paginationMeta(total, page, limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET AUTHOR BY ID (with all books)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Author profile with:
 *   - All their physical books (non-deleted, with availability)
 *   - All their digital books (non-deleted)
 */
export const getAuthorById = async (id) => {
  const author = await prisma.author.findUnique({
    where: { id },
    include: {
      books: {
        where: { deleted_at: null },
        select: {
          id: true, title: true, cover_image_url: true,
          available: true, copies: true, pages: true,
          category: { select: { id: true, name: true } },
          _count: { select: { reviews: true } },
        },
        orderBy: { title: 'asc' },
      },
      digital_books: {
        where: { deleted_at: null },
        select: {
          id: true, title: true, cover_image_url: true,
          pdf_access: true, pages: true,
          category: { select: { id: true, name: true } },
          _count: { select: { reviews: true } },
        },
        orderBy: { title: 'asc' },
      },
      _count: { select: { books: true, digital_books: true } },
    },
  });
  if (!author) throw new AppError('Author not found', 404);
  return author;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

export const createAuthor = async (data, imageFile = null) => {
  const { name, bio } = data;
  if (!name || name.trim().length < 2) throw new AppError('Author name must be at least 2 characters', 400);
  if (!bio || bio.trim().length < 10) throw new AppError('Author bio must be at least 10 characters', 400);

  // Check for duplicate name
  const existing = await prisma.author.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' } },
  });
  if (existing) throw new AppError(`Author "${name.trim()}" already exists`, 409);

  let image = data.image || '';
  if (imageFile) {
    image = await uploadImageToCloudinary(imageFile, {
      folder: 'brana/authors',
    });
  }
  if (!image) throw new AppError('Author image is required', 400);

  return prisma.author.create({
    data: { name: name.trim(), bio: bio.trim(), image },
    include: { _count: { select: { books: true, digital_books: true } } },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export const updateAuthor = async (id, data, imageFile = null) => {
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) throw new AppError('Author not found', 404);

  const updateData = {};
  if (data.name) {
    // Check duplicate on rename
    const dup = await prisma.author.findFirst({
      where: { name: { equals: data.name.trim(), mode: 'insensitive' }, NOT: { id } },
    });
    if (dup) throw new AppError(`Author "${data.name.trim()}" already exists`, 409);
    updateData.name = data.name.trim();
  }
  if (data.bio) updateData.bio = data.bio.trim();

  if (imageFile) {
    updateData.image = await uploadImageToCloudinary(imageFile, {
      folder: 'brana/authors',
    });
  } else if (data.image) {
    updateData.image = data.image;
  }

  return prisma.author.update({
    where: { id },
    data: updateData,
    include: { _count: { select: { books: true, digital_books: true } } },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hard delete an author. Only allowed if they have no books.
 */
export const deleteAuthor = async (id) => {
  const author = await prisma.author.findUnique({
    where: { id },
    include: { _count: { select: { books: true, digital_books: true } } },
  });
  if (!author) throw new AppError('Author not found', 404);

  const total = (author._count.books || 0) + (author._count.digital_books || 0);
  if (total > 0) {
    throw new AppError(
      `Cannot delete: author has ${author._count.books} physical and ${author._count.digital_books} digital books`,
      409
    );
  }

  return prisma.author.delete({ where: { id } });
};
