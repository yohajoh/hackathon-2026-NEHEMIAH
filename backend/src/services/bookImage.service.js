/**
 * Book Image Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Gallery images for both physical (Book) and digital (DigitalBook).
 *
 * - Upload multiple images with base64 storage (or swap to Cloudinary URL in production)
 * - Automatic sort_order assignment
 * - Reorder images via sort_order update
 * - Delete individual images
 * - Signed URL generation for direct browser-to-cloud uploads
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { uploadImageToCloudinary, generateSignedUploadUrl } from '../utils/cloudinary.js';

const validateBookType = (bookType) => {
  const bt = bookType?.toUpperCase();
  if (!['PHYSICAL', 'DIGITAL'].includes(bt)) {
    throw new AppError('bookType must be "physical" or "digital"', 400);
  }
  return bt;
};

const getBookField = (bookType) =>
  bookType === 'PHYSICAL' ? 'physical_book_id' : 'digital_book_id';

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

export const getBookImages = async (bookType, bookId) => {
  const bt = validateBookType(bookType);
  await verifyBookExists(bt, bookId);

  const field = getBookField(bt);
  return prisma.bookImage.findMany({
    where: { [field]: bookId, book_type: /** @type {any} */ (bt) },
    orderBy: { sort_order: 'asc' },
  });
};

export const getSignedUploadUrl = async (folder = 'brana') => {
  return generateSignedUploadUrl({ folder });
};

export const confirmUpload = async (bookType, bookId, imageUrl, isCover = false, sortOrder = null) => {
  const bt = validateBookType(bookType);
  await verifyBookExists(bt, bookId);
  const field = getBookField(bt);

  const maxResult = await prisma.bookImage.findFirst({
    where: { [field]: bookId, book_type: /** @type {any} */ (bt) },
    orderBy: { sort_order: 'desc' },
    select: { sort_order: true },
  });
  
  let nextOrder = sortOrder ?? (maxResult?.sort_order ?? 0) + 1;

  const image = await prisma.bookImage.create({
    data: {
      book_id: bookId,
      book_type: /** @type {any} */ (bt),
      [field]: bookId,
      image_url: imageUrl,
      sort_order: nextOrder,
    },
  });

  if (isCover) {
    if (bt === 'PHYSICAL') {
      await prisma.book.update({
        where: { id: bookId },
        data: { cover_image_url: imageUrl },
      });
    } else {
      await prisma.digitalBook.update({
        where: { id: bookId },
        data: { cover_image_url: imageUrl },
      });
    }
  }

  return image;
};

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

  return prisma.bookImage.findMany({
    where: { [field]: bookId, book_type: /** @type {any} */ (bt) },
    orderBy: { sort_order: 'asc' },
  });
};

export const reorderBookImages = async (bookType, bookId, orderList) => {
  const bt = validateBookType(bookType);
  if (!Array.isArray(orderList) || orderList.length === 0) {
    throw new AppError('order must be a non-empty array of { id, sort_order } objects', 400);
  }

  const field = getBookField(bt);

  const imageIds = orderList.map((o) => o.id);
  const images = await prisma.bookImage.findMany({
    where: { id: { in: imageIds }, [field]: bookId },
    select: { id: true },
  });
  if (images.length !== imageIds.length) {
    throw new AppError('One or more image IDs do not belong to this book', 400);
  }

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

export const deleteBookImage = async (id) => {
  const image = await prisma.bookImage.findUnique({ where: { id } });
  if (!image) throw new AppError('Image not found', 404);
  return prisma.bookImage.delete({ where: { id } });
};

export const setCoverImage = async (bookType, bookId, imageId) => {
  const bt = validateBookType(bookType);
  const field = getBookField(bt);

  const image = await prisma.bookImage.findFirst({
    where: { id: imageId, [field]: bookId },
  });
  if (!image) throw new AppError('Image not found for this book', 404);

  await prisma.bookImage.updateMany({
    where: { [field]: bookId, NOT: { id: imageId } },
    data: { sort_order: { increment: 1 } },
  });

  await prisma.bookImage.update({
    where: { id: imageId },
    data: { sort_order: 1 },
  });

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
