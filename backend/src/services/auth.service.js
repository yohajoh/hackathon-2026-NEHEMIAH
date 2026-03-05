import { prisma } from "../prisma.js";
import { hashPassword, comparePassword } from "../utils/password.utils.js";
import { AppError } from "../middlewares/error.middleware.js";
import { sendEmail } from "./mail.service.js";
import crypto from "crypto";

export const signup = async (userData) => {
  const { name, email, password } = userData;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError("User already exists with this email", 400);
  }

  const hashedPassword = await hashPassword(password);
  const confirmationToken = crypto.randomBytes(32).toString("hex");

  await prisma.pendingSignup.deleteMany({ where: { email } });
  await prisma.pendingSignup.create({
    data: {
      name,
      email,
      password_hash: hashedPassword,
      confirmation_token: confirmationToken,
    },
  });

  // Send confirmation email (with timeout to avoid hanging)
  const confirmUrl = `${process.env.FRONTEND_URL}/auth/confirm-email/${confirmationToken}`;
  const message = `Please confirm your email by clicking: ${confirmUrl}`;

  const emailPromise = sendEmail({
    email,
    subject: "Brana - Confirm your email",
    message,
  });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Email service timed out. Please try again.")), 15000)
  );
  await Promise.race([emailPromise, timeoutPromise]);

  return { name, email };
};

export const confirmEmail = async (token) => {
  const pending = await prisma.pendingSignup.findUnique({
    where: { confirmation_token: token },
  });

  if (!pending) {
    throw new AppError("Invalid or expired confirmation token", 400);
  }

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password_hash: pending.password_hash,
        is_confirmed: true,
        confirmation_token: null,
      },
    }),
    prisma.pendingSignup.delete({
      where: { id: pending.id },
    }),
  ]);
};

export const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError("Please provide email and password", 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await comparePassword(password, user.password_hash))) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.is_confirmed) {
    throw new AppError("Please confirm your email before logging in", 403);
  }

  if (user.is_blocked) {
    throw new AppError("Your account is blocked. Please contact admin.", 403);
  }

  return user;
};

export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError("No user found with that email address", 404);
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const resetExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: {
      reset_token: hashedToken,
      reset_expiry: resetExpiry,
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;
  const message = `Forgot your password? Reset it here: ${resetUrl}. Link expires in 10 minutes.`;

  await sendEmail({
    email,
    subject: "Brana - Password Reset Request",
    message,
  });
};

export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      reset_token: hashedToken,
      reset_expiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: hashedPassword,
      reset_token: null,
      reset_expiry: null,
    },
  });

  return updatedUser;
};

export const updatePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !(await comparePassword(currentPassword, user.password_hash))) {
    throw new AppError("Invalid current password", 401);
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: hashedPassword },
  });
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      student_id: true,
      is_confirmed: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const updateMe = async (userId, updateData) => {
  // Filter out fields that shouldn't be updated via this method
  const filteredData = {};
  const allowedFields = ["name", "phone"];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: filteredData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      student_id: true,
    },
  });

  return updatedUser;
};

export const blockUser = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { is_blocked: true },
  });
};

export const unblockUser = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { is_blocked: false },
  });
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_confirmed: true,
      is_blocked: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });
};
