/**
 * Book Image Controller
 */

import * as bookImageService from '../services/bookImage.service.js';

export const getBookImages = async (req, res) => {
  const images = await bookImageService.getBookImages(req.params.bookType, req.params.bookId);
  res.json({ status: 'success', data: { images } });
};

export const getSignedUploadUrl = async (req, res) => {
  const { folder } = req.query;
  const signedData = await bookImageService.getSignedUploadUrl(folder);
  res.json({ status: 'success', data: signedData });
};

export const confirmUpload = async (req, res) => {
  const { bookType, bookId } = req.params;
  const { imageUrl, isCover, sortOrder } = req.body;
  const image = await bookImageService.confirmUpload(bookType, bookId, imageUrl, isCover, sortOrder);
  res.json({ status: 'success', data: { image } });
};

export const addBookImages = async (req, res) => {
  const images = await bookImageService.addBookImages(
    req.params.bookType,
    req.params.bookId,
    req.files || []
  );
  res.status(201).json({ status: 'success', data: { images } });
};

export const reorderBookImages = async (req, res) => {
  const images = await bookImageService.reorderBookImages(
    req.params.bookType,
    req.params.bookId,
    req.body.order
  );
  res.json({ status: 'success', data: { images } });
};

export const setCoverImage = async (req, res) => {
  const images = await bookImageService.setCoverImage(
    req.params.bookType,
    req.params.bookId,
    req.params.imageId
  );
  res.json({ status: 'success', data: { images } });
};

export const deleteBookImage = async (req, res) => {
  await bookImageService.deleteBookImage(req.params.id);
  res.json({ status: 'success', message: 'Image deleted successfully' });
};
