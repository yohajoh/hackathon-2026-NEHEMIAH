/**
 * Book Image Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Gallery images for both physical (Book) and digital (DigitalBook).
 *
 * - Upload multiple images with base64 storage (or swap to Cloudinary URL in production)
 * - Automatic sort_order assignment
 * - Reorder images via sort_order update
 * - Delete individual images
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const validateBookType = (bookType) => {
  const bt = bookType?.toUpperCase();
  if (!['PHYSICAL', 'DIGITAL'].includes(bt)) {
    throw new AppError('bookType must be "physical" or "digital"', 400);
  }
  return bt;
};

const getBookField = (bookType) =>
  bookType === 'PHYSICAL' ? 'physical_book_id' : 'digital_book_id';

/** Verify the parent book exists. */
const verifyBookExists = async (bookType, bookId) => {
  if (bookType === 'PHYSICAL') {
    const book = await prisma.book.findFirst({ where: { id: bookId, deleted_at: null } });
    if (!book) throw new AppError('Physical book not found', 404);
    return book;
  } else {
    const book = await prisma.digitalBook.findFirst({ where: { id: bookId, deleted_at: null } });
    if (!book) throw new AppError('Digital book not found', 404);
    return book;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST IMAGES FOR A BOOK
// ─────────────────────────────────────────────────────────────────────────────

export const getBookImages = async (bookType, bookId) => {
  const bt = validateBookType(bookType);
  await verifyBookExists(bt, bookId);

  const field = getBookField(bt);
  return prisma.bookImage.findMany({
    where: { [field]: bookId, book_type: /** @type {any} */ (bt) },
    orderBy: { sort_order: 'asc' },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD IMAGE(S)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add one or more images to a book's gallery.
 * Accepts files from multer (array upload).
 * Automatically assigns next available sort_order.
 */
export const addBookImages = async (bookType, bookId, imageFiles) => {
  const bt = validateBookType(bookType);
  if (!imageFiles || imageFiles.length === 0) {
    throw new AppError('At least one image file is required', 400);
  }
  if (imageFiles.length > 10) {
    throw new AppError('Maximum 10 images can be uploaded at once', 400);
  }

  await verifyBookExists(bt, bookId);
  const field = getBookField(bt);

  // Get current max sort_order
  const maxResult = await prisma.bookImage.findFirst({
    where: { [field]: bookId, book_type: /** @type {any} */ (bt) },
    orderBy: { sort_order: 'desc' },
    select: { sort_order: true },
  });
  let nextOrder = (maxResult?.sort_order ?? 0) + 1;

  const uploadedUrls = await Promise.all(
    imageFiles.map((file) =>
      uploadImageToCloudinary(file, {
        folder: bt === 'PHYSICAL' ? 'brana/physical-books/gallery' : 'brana/digital-books/gallery',
      }),
    ),
  );

  const data = uploadedUrls.map((url) => ({
    book_id: bookId,
    book_type: /** @type {any} */ (bt),
    [field]: bookId,
    image_url: url,
    sort_order: nextOrder++,
  }));

  await prisma.bookImage.createMany({ data });

  // Return updated image list
  return prisma.bookImage.findMany({
    where: { [field]: bookId, book_type: /** @type {any} */ (bt) },
    orderBy: { sort_order: 'asc' },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// REORDER IMAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update sort_order of images.
 * Body: { order: [{ id: uuid, sort_order: int }, ...] }
 *
 * Validate that all provided IDs belong to the same book.
 */
export const reorderBookImages = async (bookType, bookId, orderList) => {
  const bt = validateBookType(bookType);
  if (!Array.isArray(orderList) || orderList.length === 0) {
    throw new AppError('order must be a non-empty array of { id, sort_order } objects', 400);
  }

  const field = getBookField(bt);

  // Validate ownership (all images must belong to this book)
  const imageIds = orderList.map((o) => o.id);
  const images = await prisma.bookImage.findMany({
    where: { id: { in: imageIds }, [field]: bookId },
    select: { id: true },
  });
  if (images.length !== imageIds.length) {
    throw new AppError('One or more image IDs do not belong to this book', 400);
  }

  // Update sort order in parallel
  await Promise.all(
    orderList.map(({ id, sort_order }) =>
      prisma.bookImage.update({
        where: { id },
        data: { sort_order: parseInt(sort_order, 10) },
      })
    )
  );

  return prisma.bookImage.findMany({
    where: { [field]: bookId, book_type: /** @type {any} */ (bt) },
    orderBy: { sort_order: 'asc' },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE IMAGE
// ─────────────────────────────────────────────────────────────────────────────

export const deleteBookImage = async (id) => {
  const image = await prisma.bookImage.findUnique({ where: { id } });
  if (!image) throw new AppError('Image not found', 404);
  return prisma.bookImage.delete({ where: { id } });
};

// ─────────────────────────────────────────────────────────────────────────────
// SET COVER IMAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Promote an image to be the cover (sets its sort_order to 0, others shift up).
 * Also updates the parent book's cover_image_url.
 */
export const setCoverImage = async (bookType, bookId, imageId) => {
  const bt = validateBookType(bookType);
  const field = getBookField(bt);

  const image = await prisma.bookImage.findFirst({
    where: { id: imageId, [field]: bookId },
  });
  if (!image) throw new AppError('Image not found for this book', 404);

  // Step 1: Shift all images up by 1
  await prisma.bookImage.updateMany({
    where: { [field]: bookId, NOT: { id: imageId } },
    data: { sort_order: { increment: 1 } },
  });

  // Step 2: Set selected image to sort_order = 1 (first)
  await prisma.bookImage.update({
    where: { id: imageId },
    data: { sort_order: 1 },
  });

  // Step 3: Update the parent book's cover_image_url
  if (bt === 'PHYSICAL') {
    await prisma.book.update({
      where: { id: bookId },
      data: { cover_image_url: image.image_url },
    });
  } else {
    await prisma.digitalBook.update({
      where: { id: bookId },
      data: { cover_image_url: image.image_url },
    });
  }

  return prisma.bookImage.findMany({
    where: { [field]: bookId, book_type: /** @type {any} */ (bt) },
    orderBy: { sort_order: 'asc' },
  });
};
