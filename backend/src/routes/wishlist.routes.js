/**
 * Wishlist Routes
 * BASE: /api/wishlist
 */

import { Router } from "express";
import * as wishlistController from "../controllers/wishlist.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = Router();

// All wishlist routes require authentication
router.use(protect);
router.use(restrictTo("STUDENT"));

router.get("/", wishlistController.getMyWishlist);
router.post("/", wishlistController.addToWishlist);

// Check status for a specific book (for toggle button in UI)
// GET /api/wishlist/status/:bookType/:bookId
router.get("/status/:bookType/:bookId", wishlistController.checkWishlistStatus);

// Remove by wishlist item ID
router.delete("/:id", wishlistController.removeFromWishlist);

// Remove by bookType + bookId (for toggle button)
// DELETE /api/wishlist/book  (body: { bookType, bookId })
router.delete("/book/remove", wishlistController.removeFromWishlistByBook);

export default router;
