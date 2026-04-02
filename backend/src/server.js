import "dotenv/config";
import cluster from "node:cluster";
import os from "node:os";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { verifyToken } from "./utils/token.utils.js";
import { scanExtendedOverdueAlerts, scanNeverReturnedAlerts } from "./services/inventoryAlert.service.js";
import { sendUpcomingReturnReminders, sendOverdueRemindersAutomated } from "./services/automatedReminder.service.js";

/**
 * @typedef {import("socket.io").Socket & { userId: string }} AuthenticatedSocket
 */

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const PORT = toNumber(process.env.PORT, 5000);
const defaultParallelism = os.cpus().length;
const CLUSTER_ENABLED = process.env.ENABLE_CLUSTER === "true";
const WEB_CONCURRENCY = Math.max(1, Math.floor(toNumber(process.env.WEB_CONCURRENCY, defaultParallelism)));

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "");

const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    normalizeOrigin("http://localhost:3000"),
    normalizeOrigin("http://localhost:3001"),
    normalizeOrigin("http://127.0.0.1:3000"),
    normalizeOrigin("http://127.0.0.1:3001"),
    ...envOrigins,
  ]),
);

// ─── Automated Jobs Configuration ───────────────────────────────────────────
// Default intervals (can be overridden via environment variables)
// AUTO_ALERT_SCAN_MS: How often to scan for inventory alerts (default: 6 hours)
// AUTO_REMINDER_INTERVAL_MS: How often to send overdue reminders (default: 1 hour for testing)
// AUTO_UPCOMING_REMINDER_INTERVAL_MS: How often to send upcoming return reminders (default: 1 hour for testing)
const AUTO_ALERT_SCAN_MS = toNumber(process.env.AUTO_ALERT_SCAN_MS, 6 * 60 * 60 * 1000);
const AUTO_REMINDER_INTERVAL_MS = toNumber(process.env.AUTO_REMINDER_INTERVAL_MS, 60 * 60 * 1000); // 1 hour for testing
const AUTO_UPCOMING_REMINDER_INTERVAL_MS = toNumber(process.env.AUTO_UPCOMING_REMINDER_INTERVAL_MS, 60 * 60 * 1000); // 1 hour for testing
const RUN_BACKGROUND_JOBS = process.env.RUN_BACKGROUND_JOBS
  ? process.env.RUN_BACKGROUND_JOBS === "true"
  : CLUSTER_ENABLED
    ? process.env.JOB_WORKER === "true"
    : process.env.NODE_ENV !== "production";

// ─── Run initial scans on server startup ───────────────────────────────────
const runInitialScans = async () => {
  console.log("🔄 Running initial automated scans...");

  try {
    // Scan for inventory alerts
    const [extended, neverReturned] = await Promise.all([scanExtendedOverdueAlerts(), scanNeverReturnedAlerts()]);
    const created = (extended?.created || 0) + (neverReturned?.created || 0);
    if (created > 0) {
      console.log(`🔔 Initial alert scan created ${created} alert(s)`);
    }
  } catch (error) {
    console.error("Initial alert scan failed:", error?.message || error);
  }

  try {
    // Send overdue reminders
    const overdueResult = await sendOverdueRemindersAutomated(app.locals.io);
    if ((overdueResult?.remindersSent || 0) > 0) {
      console.log(`🔴 Initial overdue reminder job sent ${overdueResult.remindersSent} reminder(s)`);
    } else {
      console.log("✅ No overdue reminders to send at startup");
    }
  } catch (error) {
    console.error("Initial overdue reminder job failed:", error?.message || error);
  }

  try {
    // Send upcoming return reminders
    const upcomingResult = await sendUpcomingReturnReminders(app.locals.io);
    if ((upcomingResult?.remindersSent || 0) > 0) {
      console.log(`⏰ Initial upcoming return reminder job sent ${upcomingResult.remindersSent} reminder(s)`);
    } else {
      console.log("✅ No upcoming return reminders to send at startup");
    }
  } catch (error) {
    console.error("Initial upcoming reminder job failed:", error?.message || error);
  }

  console.log("✅ Initial automated scans completed");
};

const configureBackgroundJobs = () => {
  if (!RUN_BACKGROUND_JOBS) {
    console.log("⏸️ Background jobs disabled on this instance (set RUN_BACKGROUND_JOBS=true to enable).");
    return;
  }

  // Run initial scans after a short delay to ensure server is fully ready.
  setTimeout(runInitialScans, 5000);

  setInterval(async () => {
    try {
      const [extended, neverReturned] = await Promise.all([scanExtendedOverdueAlerts(), scanNeverReturnedAlerts()]);
      const created = (extended?.created || 0) + (neverReturned?.created || 0);
      if (created > 0) {
        console.log(`🔔 Auto alert scan created ${created} alert(s)`);
      }
    } catch (error) {
      console.error("Auto alert scan failed:", error?.message || error);
    }
  }, AUTO_ALERT_SCAN_MS);

  setInterval(async () => {
    try {
      const result = await sendOverdueRemindersAutomated(app.locals.io);
      if ((result?.remindersSent || 0) > 0) {
        console.log(`🔴 Automated overdue reminder job sent ${result.remindersSent} reminder(s)`);
      }
    } catch (error) {
      console.error("Automated overdue reminder job failed:", error?.message || error);
    }
  }, AUTO_REMINDER_INTERVAL_MS);

  setInterval(async () => {
    try {
      const result = await sendUpcomingReturnReminders(app.locals.io);
      if ((result?.remindersSent || 0) > 0) {
        console.log(`⏰ Upcoming return reminder job sent ${result.remindersSent} reminder(s)`);
      }
    } catch (error) {
      console.error("Upcoming reminder job failed:", error?.message || error);
    }
  }, AUTO_UPCOMING_REMINDER_INTERVAL_MS);

  console.log(`📅 Scheduled jobs configured:`);
  console.log(`   - Alert scan: every ${AUTO_ALERT_SCAN_MS / 1000 / 60} minutes`);
  console.log(`   - Overdue reminders: every ${AUTO_REMINDER_INTERVAL_MS / 1000 / 60} minutes`);
  console.log(`   - Upcoming reminders: every ${AUTO_UPCOMING_REMINDER_INTERVAL_MS / 1000 / 60} minutes`);
};

const startWorker = () => {
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket"],
  });

  io.use((/** @type {AuthenticatedSocket} */ socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = /** @type {{ id: string }} */ (verifyToken(token));
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (/** @type {AuthenticatedSocket} */ socket) => {
    const userId = socket.userId;
    console.log(`⚡ Socket connected: user ${userId} (socket ${socket.id})`);
    socket.join(`user:${userId}`);
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: user ${userId} (socket ${socket.id})`);
    });
  });

  app.locals.io = io;

  httpServer.keepAliveTimeout = Math.max(1000, toNumber(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 65_000));
  httpServer.headersTimeout = Math.max(2000, toNumber(process.env.HTTP_HEADERS_TIMEOUT_MS, 66_000));
  httpServer.requestTimeout = Math.max(1000, toNumber(process.env.HTTP_REQUEST_TIMEOUT_MS, 30_000));
  httpServer.maxRequestsPerSocket = Math.max(100, toNumber(process.env.HTTP_MAX_REQUESTS_PER_SOCKET, 1000));

  httpServer.listen(PORT, () => {
    console.log(`🚀 Worker ${process.pid} serving on http://localhost:${PORT}`);
    console.log(`📡 Socket.io ready`);
  });

  configureBackgroundJobs();
};

if (CLUSTER_ENABLED && cluster.isPrimary) {
  console.log(`🧵 Primary ${process.pid} starting ${WEB_CONCURRENCY} worker(s).`);
  console.warn("⚠️ Cluster mode is active. For cross-worker Socket.IO broadcasts, use a shared adapter (e.g., Redis).");
  let workerIndex = 0;
  const workerRoles = new Map();

  const forkWorker = (isJobWorker) => {
    workerIndex += 1;
    const worker = cluster.fork({
      WORKER_INDEX: String(workerIndex),
      JOB_WORKER: isJobWorker ? "true" : "false",
    });
    workerRoles.set(worker.id, isJobWorker);
  };

  for (let i = 0; i < WEB_CONCURRENCY; i += 1) {
    forkWorker(i === 0);
  }

  cluster.on("exit", (worker, code, signal) => {
    const wasJobWorker = workerRoles.get(worker.id) === true;
    workerRoles.delete(worker.id);
    console.error(
      `❌ Worker ${worker.process.pid} exited (code=${code ?? "unknown"} signal=${signal ?? "none"}). Restarting...`,
    );
    forkWorker(wasJobWorker);
  });
} else {
  startWorker();
}
