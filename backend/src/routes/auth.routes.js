import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { body } from "express-validator";
import passport from "passport";
import { generateToken } from "../utils/token.utils.js";
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

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const GOOGLE_CALLBACK_TIMEOUT_MS = 25000;

// Google OAuth
router.get("/google", (req, res, next) => {
  console.log("Initiating Google Auth flow...");
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  let responded = false;
  const timeoutId = setTimeout(() => {
    if (responded) return;
    responded = true;
    console.error("Google Auth callback timed out");
    res.redirect(`${FRONTEND_URL}/auth/login?error=auth_timeout`);
  }, GOOGLE_CALLBACK_TIMEOUT_MS);

  passport.authenticate("google", { session: false }, (err, user, _info) => {
    if (responded) return;
    clearTimeout(timeoutId);
    responded = true;

    if (err) {
      console.error("Google Auth error:", err.message || err);
      return res.redirect(`${FRONTEND_URL}/auth/login?error=auth_failed`);
    }
    if (!user) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=auth_failed`);
    }

    console.log(`Google Auth successful for user: ${user.email}`);
    const token = generateToken(user.id);
    const cookieOptions = {
      expires: new Date(
        Date.now() + Number(process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    };
    res.cookie("token", token, cookieOptions);
    res.redirect(FRONTEND_URL);
  })(req, res, next);
});

// Public password reset routes
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

// Protected routes
router.use(protect);

router.get("/me", authController.getMe);
router.patch("/update-me", authController.updateMe);
router.patch("/update-password", authController.updatePassword);

// Admin only routes
router.get("/users", restrictTo("ADMIN"), authController.getAllUsers);
router.patch("/users/:id/block", restrictTo("ADMIN"), authController.blockUser);
router.patch("/users/:id/unblock", restrictTo("ADMIN"), authController.unblockUser);
router.delete("/users/:id", restrictTo("ADMIN"), authController.deleteUser);

export default router;
