import { prisma } from "../prisma.js";
import { hashPassword, comparePassword } from "../utils/password.utils.js";
import { AppError } from "../middlewares/error.middleware.js";
import { sendEmail } from "./mail.service.js";
import crypto from "crypto";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const SESSION_CONTEXT_CACHE_TTL_MS = Math.max(0, toNumber(process.env.AUTH_SESSION_CONTEXT_CACHE_TTL_MS, 5000));
const SESSION_CONTEXT_CACHE_MAX_SIZE = Math.max(100, toNumber(process.env.AUTH_SESSION_CONTEXT_CACHE_MAX_SIZE, 10000));
const sessionContextCache = new Map();

const getSessionContextCacheKey = (userId, preferredPersona) => `${userId}:${preferredPersona || "AUTO"}`;

export const invalidateSessionContextCache = (userId) => {
  if (!userId) {
    sessionContextCache.clear();
    return;
  }

  for (const key of sessionContextCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      sessionContextCache.delete(key);
    }
  }
};

const isDelegatedIdentitySchemaMissing = (error) => {
  const message = String(error?.message || "");
  return (
    error?.code === "P2021" ||
    error?.code === "P2022" ||
    /StudentProfile|UserRoleAssignment|student_profile|role_assignments/i.test(message) ||
    /Unknown arg|does not exist|Invalid .* invocation/i.test(message)
  );
};

const hasPrismaModel = (modelName) => {
  return Boolean(prisma && prisma[modelName]);
};

const ensureStudentProfile = async (user) => {
  if (!hasPrismaModel("studentProfile")) return null;
  try {
    const existing = await prisma.studentProfile.findUnique({ where: { user_id: user.id } });
    if (existing) return existing;

    return prisma.studentProfile.create({
      data: {
        user_id: user.id,
        student_number: user.student_id || null,
        year: user.year || null,
        department: user.department || null,
        phone: user.phone || null,
      },
    });
  } catch (error) {
    if (isDelegatedIdentitySchemaMissing(error)) return null;
    throw error;
  }
};

export const resolveUserSessionContext = async (userId, preferredPersona) => {
  const now = Date.now();
  const cacheKey = getSessionContextCacheKey(userId, preferredPersona);
  if (SESSION_CONTEXT_CACHE_TTL_MS > 0) {
    const cached = sessionContextCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        year: true,
        department: true,
        student_id: true,
        role: true,
        is_confirmed: true,
        is_blocked: true,
        created_at: true,
      },
    });
  } catch (error) {
    if (!isDelegatedIdentitySchemaMissing(error)) {
      throw error;
    }

    const legacyUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        student_id: true,
        role: true,
        is_confirmed: true,
        is_blocked: true,
        created_at: true,
      },
    });

    user = legacyUser
      ? {
          ...legacyUser,
          year: null,
          department: null,
        }
      : null;
  }

  if (!user) {
    throw new AppError("User not found", 404);
  }

  let roles = [user.role];
  if (hasPrismaModel("userRoleAssignment")) {
    try {
      const assignments = await prisma.userRoleAssignment.findMany({
        where: { user_id: user.id },
        select: { role: true },
      });
      const assignedRoles = assignments.map((item) => item.role);
      roles = Array.from(new Set([user.role, ...assignedRoles]));
    } catch (error) {
      if (!isDelegatedIdentitySchemaMissing(error)) {
        throw error;
      }
    }
  }

  const dedupedRoles = Array.from(new Set(roles));

  const canActAsStudent = dedupedRoles.includes("STUDENT");
  let studentProfileId = null;

  if (hasPrismaModel("studentProfile")) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { user_id: user.id },
        select: { id: true },
      });
      studentProfileId = profile?.id || null;
    } catch (error) {
      if (!isDelegatedIdentitySchemaMissing(error)) {
        throw error;
      }
    }
  }

  if (canActAsStudent && !studentProfileId) {
    const profile = await ensureStudentProfile(user);
    studentProfileId = profile?.id || null;
  }

  const activePersona =
    preferredPersona && dedupedRoles.includes(preferredPersona)
      ? preferredPersona
      : dedupedRoles.includes("ADMIN")
        ? "ADMIN"
        : "STUDENT";

  const value = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      year: user.year,
      department: user.department,
      student_id: user.student_id,
      role: user.role,
      roles: dedupedRoles,
      studentProfileId,
      activePersona,
      is_confirmed: user.is_confirmed,
      is_blocked: user.is_blocked,
      created_at: user.created_at,
    },
    sessionPayload: {
      id: user.id,
      roles: dedupedRoles,
      studentProfileId,
      activePersona,
    },
  };

  if (SESSION_CONTEXT_CACHE_TTL_MS > 0) {
    if (sessionContextCache.size >= SESSION_CONTEXT_CACHE_MAX_SIZE) {
      sessionContextCache.clear();
    }
    sessionContextCache.set(cacheKey, {
      value,
      expiresAt: now + SESSION_CONTEXT_CACHE_TTL_MS,
    });
  }

  return value;
};

export const signup = async (userData) => {
  const { name, email, password, student_id, year, phone, department } = userData;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError("User already exists with this email", 400);
  }
  if (student_id) {
    const existingStudentId = await prisma.user.findUnique({ where: { student_id } });
    if (existingStudentId) {
      throw new AppError("User already exists with this student ID", 400);
    }
  }

  const hashedPassword = await hashPassword(password);
  const confirmationToken = crypto.randomBytes(32).toString("hex");

  await prisma.pendingSignup.deleteMany({
    where: {
      OR: [{ email }, ...(student_id ? [{ student_id }] : [])],
    },
  });
  try {
    await prisma.pendingSignup.create({
      data: {
        name,
        email,
        student_id: student_id || null,
        year: year || null,
        phone: phone || null,
        department: department || null,
        password_hash: hashedPassword,
        confirmation_token: confirmationToken,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      throw new AppError("A pending account already exists with this student ID", 409);
    }
    throw error;
  }

  // Send confirmation email (with timeout to avoid hanging)
  const confirmUrl = `${process.env.FRONTEND_URL}/auth/confirm-email/${confirmationToken}`;
  const message = `Please confirm your email by clicking: ${confirmUrl}`;

  const emailPromise = sendEmail({
    email,
    subject: "Brana - Confirm your email",
    message,
  });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Email service timed out. Please try again.")), 15000),
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
        student_id: pending.student_id,
        year: pending.year,
        phone: pending.phone,
        department: pending.department,
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

export const loginOrCreateGoogleUser = async ({ email, name }) => {
  if (!email) throw new AppError("Google account email is required", 400);

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    if (user.is_blocked) {
      throw new AppError("Your account is blocked. Please contact admin.", 403);
    }
    if (!user.is_confirmed) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { is_confirmed: true, confirmation_token: null },
      });
    }
    return user;
  }

  const generatedPassword = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await hashPassword(generatedPassword);
  user = await prisma.user.create({
    data: {
      name: name || email.split("@")[0],
      email,
      password_hash: hashedPassword,
      is_confirmed: true,
    },
  });

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
      year: true,
      department: true,
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
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, student_id: true },
  });
  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // Filter out fields that shouldn't be updated via this method
  const filteredData = {};
  const allowedFields = ["name", "phone", "year", "department"];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });

  // Allow setting student_id only once (for onboarding / Google profile completion).
  if (updateData.student_id !== undefined) {
    const studentId = String(updateData.student_id || "").trim();
    if (!studentId) {
      throw new AppError("student_id cannot be empty", 400);
    }
    if (existingUser.student_id) {
      throw new AppError("student_id is already set and cannot be changed", 400);
    }
    filteredData.student_id = studentId;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: filteredData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        year: true,
        department: true,
        role: true,
        student_id: true,
      },
    });

    const hasStudentDataUpdate = ["student_id", "year", "department", "phone"].some(
      (field) => filteredData[field] !== undefined,
    );

    if (hasStudentDataUpdate) {
      if (!hasPrismaModel("studentProfile")) {
        return updatedUser;
      }
      try {
        await prisma.studentProfile.upsert({
          where: { user_id: userId },
          update: {
            student_number: updatedUser.student_id || null,
            year: updatedUser.year || null,
            department: updatedUser.department || null,
            phone: updatedUser.phone || null,
          },
          create: {
            user_id: userId,
            student_number: updatedUser.student_id || null,
            year: updatedUser.year || null,
            department: updatedUser.department || null,
            phone: updatedUser.phone || null,
          },
        });
      } catch (profileError) {
        if (!isDelegatedIdentitySchemaMissing(profileError)) {
          throw profileError;
        }
      }
    }

    return updatedUser;
  } catch (error) {
    if (error?.code === "P2002") {
      throw new AppError("This student ID is already in use", 409);
    }
    throw error;
  }
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
      student_id: true,
      phone: true,
      year: true,
      department: true,
      role: true,
      is_confirmed: true,
      is_blocked: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });
};

export const deleteUser = async (userId, currentAdminId) => {
  if (userId === currentAdminId) {
    throw new AppError("You cannot delete your own account", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          rentals: true,
          reservations: true,
          notifications: true,
          reviews: true,
          wishlists: true,
          system_config_updates: true,
          admin_activity_logs: true,
          resolved_stock_alerts: true,
        },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);

  if (user.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      throw new AppError("Cannot delete the last admin account", 409);
    }
  }

  if (user._count.rentals > 0 || user._count.reservations > 0 || user._count.system_config_updates > 0) {
    throw new AppError("Cannot delete this user because related records exist. Block the account instead.", 409);
  }

  return prisma.$transaction([
    prisma.notification.deleteMany({ where: { user_id: userId } }),
    prisma.review.deleteMany({ where: { user_id: userId } }),
    prisma.wishlist.deleteMany({ where: { user_id: userId } }),
    prisma.pendingSignup.deleteMany({ where: { email: user.email } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
};
