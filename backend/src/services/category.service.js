/**
 * Category Service
 * ─────────────────────────────────────────────────────────────────────────────
 * CRUD for book categories with:
 *   - Auto-slug generation (name → URL-safe slug)
 *   - Book counts (physical + digital) per category
 *   - Category browse with all books
 *   - Optimized with transactions and caching
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';

const generateSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export const getCategories = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.search) {
    where.name = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      include: {
        _count: { select: { books: true, digital_books: true } },
      },
    }),
    prisma.category.count({ where }),
  ]);

  return { categories, meta: paginationMeta(total, page, limit) };
};

export const getCategoryBySlugOrId = async (slugOrId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const where = isUUID ? { id: slugOrId } : { slug: slugOrId };

  const category = await prisma.category.findFirst({ where });
  if (!category) throw new AppError('Category not found', 404);

  const bookType = query.book_type?.toUpperCase();

  const [books, digitalBooks] = await Promise.all([
    (!bookType || bookType === 'PHYSICAL')
      ? prisma.book.findMany({
          where: { category_id: category.id, deleted_at: null },
          select: {
            id: true, title: true, cover_image_url: true,
            available: true, pages: true,
            author: { select: { id: true, name: true } },
            _count: { select: { reviews: true } },
          },
          orderBy: { title: 'asc' },
          skip,
          take: limit,
        })
      : [],
    (!bookType || bookType === 'DIGITAL')
      ? prisma.digitalBook.findMany({
          where: { category_id: category.id, deleted_at: null },
          select: {
            id: true, title: true, cover_image_url: true,
            pdf_access: true, pages: true,
            author: { select: { id: true, name: true } },
            _count: { select: { reviews: true } },
          },
          orderBy: { title: 'asc' },
        })
      : [],
  ]);

  return { category, books, digitalBooks };
};

export const createCategory = async ({ name }) => {
  if (!name || name.trim().length < 2)
    throw new AppError('Category name must be at least 2 characters', 400);

  const slug = generateSlug(name);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.category.findFirst({
        where: { OR: [{ name: { equals: name.trim(), mode: 'insensitive' } }, { slug }] },
      });
      if (existing) throw new AppError(`Category "${name.trim()}" already exists`, 409);

      return tx.category.create({
        data: { name: name.trim(), slug },
        include: { _count: { select: { books: true, digital_books: true } } },
      });
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create category', 500);
  }
};

export const updateCategory = async (id, { name }) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError('Category not found', 404);

  if (!name || name.trim().length < 2)
    throw new AppError('Category name must be at least 2 characters', 400);

  const slug = generateSlug(name);

  try {
    return await prisma.$transaction(async (tx) => {
      const dup = await tx.category.findFirst({
        where: {
          NOT: { id },
          OR: [{ name: { equals: name.trim(), mode: 'insensitive' } }, { slug }],
        },
      });
      if (dup) throw new AppError(`Category "${name.trim()}" already exists`, 409);

      return tx.category.update({
        where: { id },
        data: { name: name.trim(), slug },
        include: { _count: { select: { books: true, digital_books: true } } },
      });
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update category', 500);
  }
};

export const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { books: true, digital_books: true } } },
  });
  if (!category) throw new AppError('Category not found', 404);

  const total = (category._count.books || 0) + (category._count.digital_books || 0);
  if (total > 0) {
    throw new AppError(
      `Cannot delete: category has ${category._count.books} physical and ${category._count.digital_books} digital books`,
      409
    );
  }

  return prisma.category.delete({ where: { id } });
};
