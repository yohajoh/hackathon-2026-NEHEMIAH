import { verifyToken } from "../utils/token.utils.js";
import { prisma } from "../prisma.js";
import { AppError } from "./error.middleware.js";

/**
 * Middleware to protect routes and populate req.user
 * @param {import('express').Request & { user: import('@prisma/client').User }} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded || typeof decoded === "string" || !decoded.id) {
      return next(new AppError("Invalid token or session expired", 401));
    }

    const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!currentUser) {
      return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    if (currentUser.is_blocked) {
      return next(new AppError("Your account is blocked.", 403));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError("Invalid token or session expired", 401));
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
};
