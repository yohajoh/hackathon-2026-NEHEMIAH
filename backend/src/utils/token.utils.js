import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

export const generateToken = (id) => {
  const secret = String(process.env.JWT_SECRET || "fallback_secret");
  const expiresIn = String(process.env.JWT_EXPIRE || "30d");
  
  // @ts-ignore
  return jwt.sign({ id }, secret, { expiresIn });
};

export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "fallback_secret";
  return jwt.verify(token, secret);
};

export const sendTokenCookie = (user, statusCode, res) => {
  const token = generateToken(user.id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  user.password_hash = undefined;

  res.cookie("token", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};
