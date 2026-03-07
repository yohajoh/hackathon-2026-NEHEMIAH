import { Router } from 'express';
import * as reservationController from '../controllers/reservation.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/mine', reservationController.getMyReservations);
router.post('/', reservationController.createReservation);
router.patch('/:id/cancel', reservationController.cancelReservation);

router.use(restrictTo('ADMIN'));
router.get('/', reservationController.getAllReservations);
router.post('/admin/expire', reservationController.expireReservations);

export default router;
