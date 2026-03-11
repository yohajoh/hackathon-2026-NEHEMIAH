/**
 * Payment Routes
 * BASE: /api/payments
 */

import { Router } from "express";
import express from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = Router();

// ─── Public: Chapa webhook (no auth – verified by HMAC) ──────────────────────
router.post("/webhook", express.raw({ type: "application/json", limit: "1mb" }), paymentController.handleWebhook);

// All other routes require authentication
router.use(protect);

// ─── Student routes ───────────────────────────────────────────────────────────
router.use(["/mine", "/rental/:rentalId/initiate", "/verify/:txRef"], restrictTo("STUDENT"));
router.get("/mine", paymentController.getMyPayments); // Payment history
router.post("/rental/:rentalId/initiate", paymentController.initiatePayment); // Start payment
router.get("/verify/:txRef", paymentController.verifyPayment); // Verify against Chapa

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.use(restrictTo("ADMIN"));

router.get("/", paymentController.getAllPayments); // All payments + revenue
router.patch("/:paymentId/cash", paymentController.recordCashPayment); // Record cash payment

export default router;
