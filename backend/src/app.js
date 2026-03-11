import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import passport from "passport";
import "./config/passport.js";

import authRoutes from "./routes/auth.routes.js";
import bookRoutes from "./routes/book.routes.js";
import digitalBookRoutes from "./routes/digitalBook.routes.js";
import authorRoutes from "./routes/author.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import bookImageRoutes from "./routes/bookImage.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import rentalRoutes from "./routes/rental.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import systemConfigRoutes from "./routes/systemConfig.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import studentRoutes from "./routes/student.routes.js";

import { globalErrorHandler, AppError } from "./middlewares/error.middleware.js";

const app = express();
const compressionLevel = Number(process.env.HTTP_COMPRESSION_LEVEL);
const resolvedCompressionLevel = Number.isFinite(compressionLevel) ? Math.max(1, Math.min(9, compressionLevel)) : 6;

app.use(passport.initialize());
app.disable("x-powered-by");
app.set("etag", "strong");
app.set("json spaces", 0);

if (process.env.TRUST_PROXY) {
  const trustProxyValue = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isNaN(trustProxyValue) ? process.env.TRUST_PROXY : trustProxyValue);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    ...envOrigins,
  ]),
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new AppError(`Origin not allowed by CORS: ${origin}`, 403));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(
  compression({
    threshold: 1024,
    level: resolvedCompressionLevel,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);
app.use(express.json({ limit: "1mb", strict: false }));
app.use(express.urlencoded({ extended: false, limit: "50kb", parameterLimit: 100 }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/digital-books", digitalBookRoutes);
app.use("/api/authors", authorRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/book-images", bookImageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/system-config", systemConfigRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.all("/{*splat}", (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;
