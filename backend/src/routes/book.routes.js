import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public route: Everyone can see books
router.get("/", (req, res) => {
  res.json({ status: "success", message: "Publicly accessible books" });
});

// Protected route: Only logged in users can see book details
router.get("/:id", protect, (/** @type {any} */ req, res) => {
  res.json({
    status: "success",
    message: `Details for book ${req.params.id}`,
    user: req.user.name,
  });
});

// Admin-only route: Only admins can add books
router.post("/", protect, restrictTo("ADMIN"), (req, res) => {
  res.status(201).json({
    status: "success",
    message: "Book added by admin",
  });
});

export default router;
