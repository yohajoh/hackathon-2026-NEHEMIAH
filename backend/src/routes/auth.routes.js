import express from "express";
import * as authController from "../controllers/auth.controller.js";
import * as authService from "../services/auth.service.js";
import { body } from "express-validator";
import passport from "passport";
import { generateToken } from "../utils/token.utils.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const router = express.Router();

router.post(
  "/signup",
  authLimiter,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("student_id").notEmpty().withMessage("Student ID is required"),
    body("year").notEmpty().withMessage("Year is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  ],
  authController.signup,
);

router.get("/confirm-email/:token", authController.confirmEmail);

router.post("/login", authLimiter, authController.login);

router.get("/logout", authController.logout);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Google OAuth - use passport's built-in callback
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/auth/login?error=google_not_configured`);
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

// Use passport's callback handler
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, user) => {
    if (err) {
      console.error("Google Auth callback error:", err);
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_callback_error`);
    }

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_auth_failed`);
    }

    try {
      const context = await authService.resolveUserSessionContext(user.id);
      const token = generateToken(context.sessionPayload);
      const cookieOptions = {
        expires: new Date(Date.now() + Number(process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      };
      res.cookie("token", token, cookieOptions);

      const needsProfileCompletion =
        context.sessionPayload.activePersona === "STUDENT" &&
        (!context.user.student_id || !context.user.phone || !context.user.year || !context.user.department);
      const redirectPath = needsProfileCompletion
        ? "/auth/complete-profile"
        : context.sessionPayload.activePersona === "ADMIN"
          ? "/dashboard/admin"
          : "/dashboard/student";

      return res.redirect(`${FRONTEND_URL}${redirectPath}`);
    } catch (callbackError) {
      console.error("Google Auth callback error:", callbackError);
      return res.redirect(`${FRONTEND_URL}/auth/login?error=google_callback_error`);
    }
  })(req, res, next);
});

router.get("/me", protect, authController.getMe);
router.patch("/persona", protect, authController.switchPersona);
router.patch(
  "/update-me",
  protect,
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("phone").optional(),
    body("year").optional(),
    body("department").optional(),
  ],
  authController.updateMe,
);
router.patch(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  ],
  authController.updatePassword,
);
router.delete("/delete-me", protect, authController.deleteUser);

router.use(protect);
router.use(restrictTo("ADMIN"));

router.get("/users", authController.getAllUsers);
router.delete("/users/:id", authController.deleteUser);
router.patch("/users/:id/block", authController.blockUser);
router.patch("/users/:id/unblock", authController.unblockUser);
router.patch("/users/:id/promote-admin", authController.promoteStudentToAdmin);
router.patch("/users/:id/convert-student", authController.convertAdminToStudent);
router.patch("/users/:id/transfer-super-admin", authController.transferSuperAdmin);

export default router;
