/**
 * Rental Routes
 * BASE: /api/rentals
 */

import { Router } from "express";
import * as rentalController from "../controllers/rental.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = Router();

// All rental routes require authentication
router.use(protect);

// ─── Student routes ───────────────────────────────────────────────────────────
router.use(["/mine", "/borrow"], restrictTo("STUDENT"));
router.get("/mine", rentalController.getMyRentals); // Student: my rental history
router.post("/borrow", rentalController.borrowBook); // Student: borrow a book
router.get("/:id", rentalController.getRental); // Student/Admin: get single rental

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.use(restrictTo("ADMIN"));

router.get("/", rentalController.getAllRentals); // Admin: all rentals (filterable)
router.get("/admin/overdue", rentalController.getOverdueRentals); // Admin: overdue list + estimated fines
router.get("/admin/overdue-ranking", rentalController.getOverdueRanking);
router.post("/admin/send-reminders", rentalController.sendOverdueReminders); // Admin: blast overdue reminders
router.patch("/:id/return", rentalController.returnBook); // Admin: process return
router.patch("/:id/extend", rentalController.extendRental); // Admin: extend due date

export default router;
