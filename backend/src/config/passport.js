import "dotenv/config";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../prisma.js";
import crypto from "crypto";
import { hashPassword } from "../utils/password.utils.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientDbError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "P1001" ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("can't reach database server")
  );
};

const withDbRetry = async (operation, maxAttempts = 2) => {
  let attempt = 0;
  let lastError;
  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (!isTransientDbError(error) || attempt >= maxAttempts) {
        throw error;
      }
      await delay(150 * attempt);
    }
  }
  throw lastError;
};

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackUrl = process.env.CALLBACK_URL;

console.log("📋 Loading passport configuration...");
console.log("Google Client ID:", googleClientId ? "configured" : "NOT configured");
console.log("Callback URL:", callbackUrl);

if (googleClientId && googleClientSecret && callbackUrl) {
  console.log("✅ Google OAuth strategy being configured...");
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: callbackUrl,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("🔐 Google OAuth callback received for:", profile.emails?.[0]?.value);
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email provided by Google"), null);
          }
          const displayName = profile.displayName || email.split("@")[0];

          let user = await withDbRetry(() => prisma.user.findUnique({ where: { email } }));

          if (user) {
            console.log("📝 Existing Google user found:", user.email);
            if (user.is_blocked) {
              return done(new Error("Your account is blocked. Please contact admin."), null);
            }
            if (!user.is_confirmed) {
              user = await withDbRetry(() =>
                prisma.user.update({
                  where: { id: user.id },
                  data: { is_confirmed: true, confirmation_token: null },
                }),
              );
            }
            return done(null, user);
          }

          console.log("👤 Creating new Google user:", email);
          const generatedPassword = crypto.randomBytes(32).toString("hex");
          const hashedPassword = await hashPassword(generatedPassword);
          user = await withDbRetry(() =>
            prisma.user.create({
              data: {
                name: displayName,
                email,
                password_hash: hashedPassword,
                is_confirmed: true,
              },
            }),
          );
          return done(null, user);
        } catch (error) {
          console.error("❌ Google OAuth error:", error);
          if (isTransientDbError(error)) {
            return done(null, false, { message: "database_timeout" });
          }
          return done(error, null);
        }
      },
    ),
  );
  console.log("✅ Google OAuth strategy configured successfully");
} else {
  console.warn(
    "⚠️ Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and CALLBACK_URL environment variables.",
  );
}

passport.serializeUser((user, done) => {
  done(null, user["id"]);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await withDbRetry(() => prisma.user.findUnique({ where: { id } }), 2);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
