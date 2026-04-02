import jwt from "jsonwebtoken";

export const generateToken = (payloadOrId) => {
  const secret = String(process.env.JWT_SECRET || "fallback_secret");
  const expiresIn = String(process.env.JWT_EXPIRE || "30d");

  const payload =
    typeof payloadOrId === "string"
      ? { id: payloadOrId }
      : {
          id: payloadOrId?.id,
          ...(Array.isArray(payloadOrId?.roles) ? { roles: payloadOrId.roles } : {}),
          ...(payloadOrId?.studentProfileId ? { studentProfileId: payloadOrId.studentProfileId } : {}),
          ...(payloadOrId?.activePersona ? { activePersona: payloadOrId.activePersona } : {}),
        };

  // @ts-ignore
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "fallback_secret";
  return jwt.verify(token, secret);
};

export const sendTokenCookie = (user, statusCode, res, tokenPayload) => {
  const token = generateToken(tokenPayload || user.id);
  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    expires: new Date(Date.now() + Number(process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    path: "/",
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  };

  user.password_hash = undefined;

  res.cookie("token", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
      session: {
        roles: tokenPayload?.roles || [user.role],
        activePersona: tokenPayload?.activePersona || user.role,
        studentProfileId: tokenPayload?.studentProfileId || null,
      },
    },
  });
};
