import * as authService from "../services/auth.service.js";
import { AppError } from "../middlewares/error.middleware.js";
import { sendTokenCookie } from "../utils/token.utils.js";
import { validationResult } from "express-validator";

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
    sendTokenCookie(user, 200, res);
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
    const user = await authService.getMe(req.user.id);
    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await authService.updateMe(req.user.id, req.body);
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
    await authService.updatePassword(req.user.id, req.body.current_password, req.body.new_password);
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
    res.status(200).json({
      status: "success",
      message: "User unblocked successfully",
    });
  } catch (error) {
    next(error);
  }
};
