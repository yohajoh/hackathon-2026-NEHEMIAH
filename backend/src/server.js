import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { verifyToken } from "./utils/token.utils.js";
import { scanExtendedOverdueAlerts, scanNeverReturnedAlerts } from "./services/inventoryAlert.service.js";
import { sendOverdueReminders } from "./services/rental.service.js";
import { sendUpcomingReturnReminders, sendOverdueRemindersAutomated } from "./services/automatedReminder.service.js";

/**
 * @typedef {import("socket.io").Socket & { userId: string }} AuthenticatedSocket
 */

const PORT = process.env.PORT || 5000;
const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(new Set(["http://localhost:3000", "http://localhost:3001", ...envOrigins]));

// ─── Create HTTP server ───────────────────────────────────────────────────────
const httpServer = createServer(app);

// ─── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ─── Socket.io Authentication Middleware ─────────────────────────────────────
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

// ─── Connection Handler ───────────────────────────────────────────────────────
io.on("connection", (/** @type {AuthenticatedSocket} */ socket) => {
  const userId = socket.userId;
  console.log(`⚡ Socket connected: user ${userId} (socket ${socket.id})`);

  // Join personal room for targeted notifications
  socket.join(`user:${userId}`);

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: user ${userId} (socket ${socket.id})`);
  });
});

// ─── Attach io to app so controllers can access it ───────────────────────────
app.locals.io = io;

// ─── Start Server ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
});

// ─── Automated Jobs Configuration ───────────────────────────────────────────
// Default intervals (can be overridden via environment variables)
// AUTO_ALERT_SCAN_MS: How often to scan for inventory alerts (default: 6 hours)
// AUTO_REMINDER_INTERVAL_MS: How often to send overdue reminders (default: 1 hour for testing)
// AUTO_UPCOMING_REMINDER_INTERVAL_MS: How often to send upcoming return reminders (default: 1 hour for testing)
const AUTO_ALERT_SCAN_MS = Number(process.env.AUTO_ALERT_SCAN_MS || 6 * 60 * 60 * 1000);
const AUTO_REMINDER_INTERVAL_MS = Number(process.env.AUTO_REMINDER_INTERVAL_MS || 60 * 60 * 1000); // 1 hour for testing
const AUTO_UPCOMING_REMINDER_INTERVAL_MS = Number(process.env.AUTO_UPCOMING_REMINDER_INTERVAL_MS || 60 * 60 * 1000); // 1 hour for testing

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

// Run initial scans after a short delay to ensure server is fully ready
setTimeout(runInitialScans, 5000);

// ─── Scheduled Jobs ─────────────────────────────────────────────────────────

// Scan for inventory alerts periodically
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

// Send overdue reminders periodically
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

// Send upcoming return reminders periodically
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

// Also keep the old sendOverdueReminders for backward compatibility
setInterval(async () => {
  try {
    const result = await sendOverdueReminders(app.locals.io);
    if ((result?.remindersSent || 0) > 0) {
      console.log(`Reminder job sent ${result.remindersSent} overdue reminder(s)`);
    }
  } catch (error) {
    console.error("Reminder job failed:", error?.message || error);
  }
}, AUTO_REMINDER_INTERVAL_MS);

console.log(`📅 Scheduled jobs configured:`);
console.log(`   - Alert scan: every ${AUTO_ALERT_SCAN_MS / 1000 / 60} minutes`);
console.log(`   - Overdue reminders: every ${AUTO_REMINDER_INTERVAL_MS / 1000 / 60} minutes`);
console.log(`   - Upcoming reminders: every ${AUTO_UPCOMING_REMINDER_INTERVAL_MS / 1000 / 60} minutes`);
