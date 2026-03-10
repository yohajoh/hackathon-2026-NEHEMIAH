/**
 * Book Image Routes
 * BASE: /api/book-images
 *
 * URL pattern: /api/book-images/:bookType/:bookId
 *   bookType: physical | digital
 *   bookId:   UUID of the book
 */

import { Router } from 'express';
import * as bookImageController from '../controllers/bookImage.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { uploadImage } from '../utils/upload.js';

const router = Router();

router.get('/:bookType/:bookId', bookImageController.getBookImages);

router.use(protect, restrictTo('ADMIN'));

router.get('/signed-upload', bookImageController.getSignedUploadUrl);
router.post('/confirm-upload/:bookType/:bookId', bookImageController.confirmUpload);
router.post('/:bookType/:bookId', uploadImage.array('images', 10), bookImageController.addBookImages);
router.put('/:bookType/:bookId/reorder', bookImageController.reorderBookImages);
router.patch('/:bookType/:bookId/cover/:imageId', bookImageController.setCoverImage);
router.delete('/:id', bookImageController.deleteBookImage);

export default router;
