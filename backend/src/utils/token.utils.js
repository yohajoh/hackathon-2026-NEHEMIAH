import jwt from "jsonwebtoken";

const normalizeSameSite = (value, fallback) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "none" || normalized === "lax" || normalized === "strict") {
    return normalized;
  }
  return fallback;
};

export const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const frontendUrl = String(process.env.FRONTEND_URL || "");
  const isHttpsFrontend = frontendUrl.startsWith("https://");

  let secure = isProduction || isHttpsFrontend;
  if (process.env.COOKIE_SECURE !== undefined) {
    secure = String(process.env.COOKIE_SECURE).toLowerCase() === "true";
  }

  let sameSite = normalizeSameSite(process.env.COOKIE_SAMESITE, secure ? "none" : "lax");
  if (sameSite === "none" && !secure) {
    secure = true;
  }

  const domain = process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN) : undefined;

  return {
    httpOnly: true,
    path: "/",
    secure,
    sameSite,
    ...(domain ? { domain } : {}),
  };
};

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
  const baseCookieOptions = getAuthCookieOptions();
  const cookieOptions = {
    ...baseCookieOptions,
    expires: new Date(Date.now() + Number(process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
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
