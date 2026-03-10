/**
 * Notification Routes
 * BASE: /api/notifications
 */

import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/mine', notificationController.getMyNotifications);
router.patch('/mine/read-all', notificationController.markAllAsRead);
router.delete('/mine/read', notificationController.deleteAllRead);
router.patch('/mine/view/:id', notificationController.viewNotification);
router.patch('/mine/read-multiple', notificationController.markMultipleAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

router.use(restrictTo('ADMIN'));

router.get('/', notificationController.getAllNotifications);
router.post('/broadcast', notificationController.broadcastNotification);

export default router;
