/**
 * Digital Book Routes
 * BASE: /api/digital-books
 */

import { Router } from "express";
import * as digitalBookController from "../controllers/digitalBook.controller.js";
import { optionalProtect, protect, restrictTo } from "../middlewares/auth.middleware.js";
import { uploadBookFiles } from "../utils/upload.js";

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get("/", digitalBookController.getDigitalBooks);

// IMPORTANT: More specific routes must come before parameterized routes
router.get("/:id/pdf", protect, digitalBookController.streamPdf);
router.post("/:id/read", protect, digitalBookController.markAsRead);
router.get("/:id/page-data", optionalProtect, digitalBookController.getDigitalBookPageData);
router.get("/:id", optionalProtect, digitalBookController.getDigitalBook);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.use(protect, restrictTo("ADMIN"));

router.get("/admin/list", digitalBookController.getAdminDigitalBooks);
router.post(
  "/",
  uploadBookFiles.fields([
    { name: "pdf", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  digitalBookController.createDigitalBook,
);
router.patch(
  "/:id",
  uploadBookFiles.fields([
    { name: "pdf", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  digitalBookController.updateDigitalBook,
);
router.delete("/:id", digitalBookController.deleteDigitalBook);

export default router;
