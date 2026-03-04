import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { body } from "express-validator";
import passport from "passport";
import { sendTokenCookie } from "../utils/token.utils.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const router = express.Router();

router.post(
  "/signup",
  authLimiter,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  ],
  authController.signup
);

router.get("/confirm-email/:token", authController.confirmEmail);

router.post("/login", authLimiter, authController.login);

router.get("/logout", authController.logout);

// Google OAuth
router.get("/google", (req, res, next) => {
  console.log("Initiating Google Auth flow...");
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, send JWT
    sendTokenCookie(req.user, 200, res);
  }
);

// Protected routes
router.use(protect);

router.get("/me", authController.getMe);
router.patch("/update-me", authController.updateMe);
router.patch("/update-password", authController.updatePassword);

// Admin only routes
router.get("/users", restrictTo("ADMIN"), authController.getAllUsers);
router.patch("/users/:id/block", restrictTo("ADMIN"), authController.blockUser);
router.patch("/users/:id/unblock", restrictTo("ADMIN"), authController.unblockUser);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required")],
  authController.forgotPassword
);

router.post(
  "/reset-password/:token",
  [body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")],
  authController.resetPassword
);

export default router;
