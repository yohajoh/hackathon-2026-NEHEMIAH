/**
 * Author Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Full CRUD with:
 *   - Book count and digital book count per author
 *   - Author search
 *   - Author profile with all books listed
 *   - Image upload support
 *   - Optimized with transactions
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

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

export const createAuthor = async (data, imageFile = null) => {
  const { name, bio } = data;
  if (!name || name.trim().length < 2) throw new AppError('Author name must be at least 2 characters', 400);
  if (!bio || bio.trim().length < 10) throw new AppError('Author bio must be at least 10 characters', 400);

  let image = data.image || '';
  if (imageFile) {
    image = await uploadImageToCloudinary(imageFile, {
      folder: 'brana/authors',
    });
  }
  if (!image) throw new AppError('Author image is required', 400);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.author.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' } },
      });
      if (existing) throw new AppError(`Author "${name.trim()}" already exists`, 409);

      return tx.author.create({
        data: { name: name.trim(), bio: bio.trim(), image },
        include: { _count: { select: { books: true, digital_books: true } } },
      });
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create author', 500);
  }
};

export const updateAuthor = async (id, data, imageFile = null) => {
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) throw new AppError('Author not found', 404);

  const updateData = {};
  if (data.name) {
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

  if (data.name && data.name.trim() !== author.name) {
    const dup = await prisma.author.findFirst({
      where: { name: { equals: data.name.trim(), mode: 'insensitive' }, NOT: { id } },
    });
    if (dup) throw new AppError(`Author "${data.name.trim()}" already exists`, 409);
  }

  return prisma.author.update({
    where: { id },
    data: updateData,
    include: { _count: { select: { books: true, digital_books: true } } },
  });
};

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
