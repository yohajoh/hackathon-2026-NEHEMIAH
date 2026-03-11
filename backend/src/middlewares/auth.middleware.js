import { verifyToken } from "../utils/token.utils.js";
import { prisma } from "../prisma.js";
import { AppError } from "./error.middleware.js";

const AUTH_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  year: true,
  department: true,
  student_id: true,
  role: true,
  is_super_admin: true,
  is_confirmed: true,
  is_blocked: true,
  created_at: true,
};

const AUTH_USER_SELECT_LEGACY = {
  id: true,
  name: true,
  email: true,
  phone: true,
  student_id: true,
  role: true,
  is_confirmed: true,
  is_blocked: true,
  created_at: true,
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const AUTH_USER_CACHE_TTL_MS = Math.max(0, toNumber(process.env.AUTH_USER_CACHE_TTL_MS, 5000));
const AUTH_USER_CACHE_MAX_SIZE = Math.max(100, toNumber(process.env.AUTH_USER_CACHE_MAX_SIZE, 10000));
const authUserCache = new Map();

const isJwtError = (error) => {
  const name = String(error?.name || "");
  return name === "TokenExpiredError" || name === "JsonWebTokenError" || name === "NotBeforeError";
};

const isSchemaDriftError = (error) => {
  const message = String(error?.message || "");
  return (
    error?.code === "P2022" ||
    /does not exist|Unknown arg|Unknown field|Invalid .* invocation|is_super_admin/i.test(message)
  );
};

const clearAuthCookie = (res) => {
  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
};

const getTokenFromRequest = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

const deriveEffectiveRoles = (decodedRoles, currentUser) => {
  const delegatedStudentRoles = Array.isArray(decodedRoles) ? decodedRoles.filter((role) => role === "STUDENT") : [];

  const roles = Array.from(new Set([currentUser.role, ...delegatedStudentRoles]));

  if (currentUser.role === "SUPER_ADMIN" && !roles.includes("ADMIN")) {
    roles.push("ADMIN");
  }

  if ((currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN") && !roles.includes("STUDENT")) {
    roles.push("STUDENT");
  }

  if (
    currentUser.role === "SUPER_ADMIN" ||
    ((currentUser.role === "ADMIN" || roles.includes("ADMIN")) && currentUser.is_super_admin)
  ) {
    roles.push("SUPER_ADMIN");
  }

  return Array.from(new Set(roles));
};

const getCachedAuthUser = async (userId) => {
  const now = Date.now();
  if (AUTH_USER_CACHE_TTL_MS > 0) {
    const cached = authUserCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });
  } catch (error) {
    if (!isSchemaDriftError(error)) {
      throw error;
    }

    const legacyUser = await prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT_LEGACY,
    });

    user = legacyUser
      ? {
          ...legacyUser,
          year: null,
          department: null,
          is_super_admin: false,
        }
      : null;
  }

  if (AUTH_USER_CACHE_TTL_MS > 0 && user) {
    if (authUserCache.size >= AUTH_USER_CACHE_MAX_SIZE) {
      authUserCache.clear();
    }
    authUserCache.set(userId, {
      user,
      expiresAt: now + AUTH_USER_CACHE_TTL_MS,
    });
  }

  return user;
};

export const invalidateAuthUserCache = (userId) => {
  if (!userId) {
    authUserCache.clear();
    return;
  }
  authUserCache.delete(userId);
};

/**
 * Middleware to protect routes and populate req.user
 * @param {import('express').Request & { user: import('@prisma/client').User }} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded || typeof decoded === "string" || !decoded.id) {
      clearAuthCookie(res);
      return next(new AppError("Invalid token or session expired", 401));
    }

    const currentUser = await getCachedAuthUser(decoded.id);

    if (!currentUser) {
      clearAuthCookie(res);
      return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    if (currentUser.is_blocked) {
      return next(new AppError("Your account is blocked.", 403));
    }

    const roles = deriveEffectiveRoles(decoded.roles, currentUser);

    req.user = currentUser;
    req.authContext = {
      roles,
      activePersona:
        typeof decoded.activePersona === "string"
          ? decoded.activePersona
          : roles.includes("ADMIN")
            ? "ADMIN"
            : currentUser.role,
      studentProfileId: decoded.studentProfileId || null,
    };

    next();
  } catch (error) {
    if (isJwtError(error)) {
      clearAuthCookie(res);
      return next(new AppError("Invalid token or session expired", 401));
    }
    return next(error);
  }
};

/**
 * Optional auth middleware.
 * If token is missing/invalid, request continues as anonymous.
 * If token is valid, req.user is attached.
 */
export const optionalProtect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || typeof decoded === "string" || !decoded.id) {
      clearAuthCookie(res);
      return next();
    }

    const currentUser = await getCachedAuthUser(decoded.id);

    if (!currentUser || currentUser.is_blocked) {
      clearAuthCookie(res);
      return next();
    }

    const roles = deriveEffectiveRoles(decoded.roles, currentUser);

    req.user = currentUser;

    req.authContext = {
      roles,
      activePersona:
        typeof decoded.activePersona === "string"
          ? decoded.activePersona
          : roles.includes("ADMIN")
            ? "ADMIN"
            : currentUser.role,
      studentProfileId: decoded.studentProfileId || null,
    };

    return next();
  } catch (error) {
    if (isJwtError(error)) {
      clearAuthCookie(res);
    }
    return next();
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    const assignedRoles = Array.isArray(req.authContext?.roles) ? req.authContext.roles : [req.user.role];
    const hasRole = roles.some((role) => assignedRoles.includes(role));
    if (!hasRole) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }

    if (req.authContext?.activePersona && !roles.includes(req.authContext.activePersona)) {
      return next(new AppError("Switch persona to access this resource", 403));
    }

    next();
  };
};
