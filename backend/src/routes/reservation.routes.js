import { Router } from "express";
import * as reservationController from "../controllers/reservation.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/mine", restrictTo("STUDENT"), reservationController.getMyReservations);
router.post("/", restrictTo("STUDENT"), reservationController.createReservation);
router.patch("/:id/cancel", restrictTo("STUDENT"), reservationController.cancelReservation);

router.use(restrictTo("ADMIN"));
router.get("/", reservationController.getAllReservations);
router.get("/admin/high-demand", reservationController.getHighDemand);
router.post("/admin/expire", reservationController.expireReservations);
router.patch("/actions/:id/move-top", reservationController.moveToTop);
router.post("/actions/:id/issue", reservationController.issueReservation);

export default router;
