import * as authService from "../services/auth.service.js";
import { AppError } from "../middlewares/error.middleware.js";
import { sendTokenCookie } from "../utils/token.utils.js";
import { validationResult } from "express-validator";
import { logAdminActivity } from "../services/adminActivity.service.js";
import { invalidateAuthUserCache } from "../middlewares/auth.middleware.js";

export const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError("Validation failed", 400));
  }

  try {
    const user = await authService.signup(req.body);
    res.status(201).json({
      status: "success",
      message: "User registered successfully. Please check your email to confirm your account.",
      data: { user },
    });
  } catch (error) {
    console.error("Signup error:", error?.message || error);
    if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
      return next(new AppError("Database setup incomplete. Please run: pnpm prisma db push", 500));
    }
    next(error);
  }
};

export const confirmEmail = async (req, res, next) => {
  try {
    await authService.confirmEmail(req.params.token);
    res.status(200).json({
      status: "success",
      message: "Email confirmed successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await authService.login(req.body);
    const context = await authService.resolveUserSessionContext(user.id);
    sendTokenCookie(context.user, 200, res, context.sessionPayload);
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

export const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.status(200).json({
      status: "success",
      message: "Password reset link sent to your email.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const user = await authService.resetPassword(req.params.token, req.body.password);
    sendTokenCookie(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError("You are not logged in! Please log in to get access.", 401);
    }

    const roles = Array.isArray(req.authContext?.roles) ? req.authContext.roles : [req.user.role];
    const activePersona = req.authContext?.activePersona || (roles.includes("ADMIN") ? "ADMIN" : "STUDENT");
    const studentProfileId = req.authContext?.studentProfileId || null;

    const user = {
      ...req.user,
      roles,
      activePersona,
      studentProfileId,
    };

    res.status(200).json({
      status: "success",
      data: {
        user,
        session: {
          roles,
          activePersona,
          studentProfileId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const switchPersona = async (req, res, next) => {
  try {
    const requestedPersona = String(req.body?.activePersona || "").toUpperCase();
    if (!["ADMIN", "STUDENT"].includes(requestedPersona)) {
      throw new AppError("activePersona must be ADMIN or STUDENT", 400);
    }

    const context = await authService.resolveUserSessionContext(req.user.id, requestedPersona);
    if (!context.sessionPayload.roles.includes(requestedPersona)) {
      throw new AppError("You do not have this persona", 403);
    }

    if (requestedPersona !== req.authContext?.activePersona) {
      await logAdminActivity({
        adminUserId: req.user.id,
        action: "PERSONA_SWITCH",
        entityType: "USER",
        entityId: req.user.id,
        description: `Switched active persona to ${requestedPersona}`,
        metadata: { activePersona: requestedPersona },
        req,
      });
    }

    invalidateAuthUserCache(req.user.id);
    authService.invalidateSessionContextCache(req.user.id);
    sendTokenCookie(context.user, 200, res, context.sessionPayload);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await authService.updateMe(req.user.id, req.body);
    invalidateAuthUserCache(req.user.id);
    authService.invalidateSessionContextCache(req.user.id);
    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    // Support both camelCase and snake_case
    const currentPassword = req.body.currentPassword || req.body.current_password;
    const newPassword = req.body.newPassword || req.body.new_password;

    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }

    await authService.updatePassword(req.user.id, currentPassword, newPassword);
    invalidateAuthUserCache(req.user.id);
    authService.invalidateSessionContextCache(req.user.id);
    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    res.status(200).json({
      status: "success",
      results: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    await authService.blockUser(req.params.id);
    invalidateAuthUserCache(req.params.id);
    authService.invalidateSessionContextCache(req.params.id);
    await logAdminActivity({
      adminUserId: req.user.id,
      action: "BLOCK",
      entityType: "USER",
      entityId: req.params.id,
      description: `Blocked user ${req.params.id}`,
      req,
    });
    res.status(200).json({
      status: "success",
      message: "User blocked successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    await authService.unblockUser(req.params.id);
    invalidateAuthUserCache(req.params.id);
    authService.invalidateSessionContextCache(req.params.id);
    await logAdminActivity({
      adminUserId: req.user.id,
      action: "UNBLOCK",
      entityType: "USER",
      entityId: req.params.id,
      description: `Unblocked user ${req.params.id}`,
      req,
    });
    res.status(200).json({
      status: "success",
      message: "User unblocked successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await authService.deleteUser(req.params.id, req.user.id);
    invalidateAuthUserCache(req.params.id);
    authService.invalidateSessionContextCache(req.params.id);
    await logAdminActivity({
      adminUserId: req.user.id,
      action: "DELETE",
      entityType: "USER",
      entityId: req.params.id,
      description: `Deleted user ${req.params.id}`,
      req,
    });
    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
