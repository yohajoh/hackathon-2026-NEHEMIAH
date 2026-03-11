import { Router } from "express";
import * as studentController from "../controllers/student.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/popularity", studentController.getPopularity);

router.use(protect, restrictTo("STUDENT"));

router.get("/overview", studentController.getOverview);
router.get("/recommendations", studentController.getRecommendations);

export default router;
