/**
 * Wishlist Service
 * ─────────────────────────────────────────────────────────────────────────────
 * User wishlists with:
 *   - Filter by type (physical/digital)
 *   - Check if book is in current user's wishlist
 *   - Availability status on each wishlist item
 *   - Optimized with batch operations
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';

export const getMyWishlist = async (userId, query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const where = { user_id: userId };

  if (query.book_type) {
    const bt = query.book_type.toUpperCase();
    if (['PHYSICAL', 'DIGITAL'].includes(bt)) {
      where.book_type = /** @type {any} */ (bt);
    }
  }

  const [items, total] = await Promise.all([
    prisma.wishlist.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        physical_book: {
          select: {
            id: true, title: true, cover_image_url: true,
            available: true, copies: true, pages: true, deleted_at: true,
            author: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
        },
        digital_book: {
          select: {
            id: true, title: true, cover_image_url: true,
            pdf_access: true, pages: true, deleted_at: true,
            author: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.wishlist.count({ where }),
  ]);

  const enriched = items.map((item) => ({
    ...item,
    bookAvailable:
      item.physical_book
        ? item.physical_book.deleted_at === null && item.physical_book.available > 0
        : item.digital_book?.deleted_at === null,
    bookDeleted:
      item.physical_book?.deleted_at !== null || item.digital_book?.deleted_at !== null,
  }));

  return { wishlist: enriched, meta: paginationMeta(total, page, limit) };
};

export const addToWishlist = async (userId, { bookType, bookId }) => {
  if (!bookType || !bookId) throw new AppError('bookType and bookId are required', 400);

  const bt = bookType.toUpperCase();
  if (!['PHYSICAL', 'DIGITAL'].includes(bt)) {
    throw new AppError('bookType must be PHYSICAL or DIGITAL', 400);
  }

  const field = bt === 'PHYSICAL' ? 'physical_book_id' : 'digital_book_id';

  try {
    return await prisma.$transaction(async (tx) => {
      if (bt === 'PHYSICAL') {
        const book = await tx.book.findFirst({ where: { id: bookId, deleted_at: null } });
        if (!book) throw new AppError('Book not found', 404);
      } else {
        const book = await tx.digitalBook.findFirst({ where: { id: bookId, deleted_at: null } });
        if (!book) throw new AppError('Digital book not found', 404);
      }

      const existing = await tx.wishlist.findFirst({
        where: { user_id: userId, [field]: bookId },
      });
      if (existing) throw new AppError('Book is already in your wishlist', 409);

      return tx.wishlist.create({
        data: {
          user_id: userId,
          book_type: /** @type {any} */ (bt),
          [field]: bookId,
        },
        include: {
          physical_book: { select: { id: true, title: true, cover_image_url: true, available: true } },
          digital_book: { select: { id: true, title: true, cover_image_url: true, pdf_access: true } },
        },
      });
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to add to wishlist', 500);
  }
};

export const removeFromWishlist = async (id, userId) => {
  const item = await prisma.wishlist.findUnique({ where: { id } });
  if (!item) throw new AppError('Wishlist item not found', 404);
  if (item.user_id !== userId) throw new AppError('Forbidden: not your wishlist item', 403);
  return prisma.wishlist.delete({ where: { id } });
};

export const removeFromWishlistByBook = async (userId, { bookType, bookId }) => {
  const bt = bookType.toUpperCase();
  const field = bt === 'PHYSICAL' ? 'physical_book_id' : 'digital_book_id';

  const item = await prisma.wishlist.findFirst({
    where: { user_id: userId, [field]: bookId },
  });
  if (!item) throw new AppError('Item not found in your wishlist', 404);
  return prisma.wishlist.delete({ where: { id: item.id } });
};

export const checkWishlistStatus = async (userId, bookType, bookId) => {
  const bt = bookType.toUpperCase();
  const field = bt === 'PHYSICAL' ? 'physical_book_id' : 'digital_book_id';
  const item = await prisma.wishlist.findFirst({
    where: { user_id: userId, [field]: bookId },
    select: { id: true },
  });
  return { isInWishlist: !!item, wishlistId: item?.id || null };
};
