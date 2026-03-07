/**
 * Notification Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles ALL system notifications:
 *   - User-targeted notifications delivered via Socket.io in real-time
 *   - Admin notifications for key system events
 *   - Batch broadcast to all users
 *   - Persistent storage in DB with read/unread state
 *
 * Notification Types:
 *   INFO   – General informational messages (borrow confirmed, return confirmed, etc.)
 *   ALERT  – Warnings requiring attention (overdue, fine applied, account blocked)
 *   SYSTEM – System-wide announcements from admin
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';

// ─────────────────────────────────────────────────────────────────────────────
// CORE NOTIFICATION CREATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a notification for a specific user and emit it via Socket.io.
 * This is used internally by all other services.
 *
 * @param {{ userId: string, message: string, type?: 'INFO'|'ALERT'|'SYSTEM', io?: any }} opts
 */
export const createNotification = async ({ userId, message, type = 'INFO', io }) => {
  // Check if user has notifications enabled (via global system config)
  // We skip this check here and let callers decide – it keeps this fn fast.

  const notification = await prisma.notification.create({
    data: {
      user_id: userId,
      message,
      type: /** @type {any} */ (type),
    },
  });

  // Emit real-time if Socket.io instance is provided
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      id: notification.id,
      message: notification.message,
      type: notification.type,
      is_read: notification.is_read,
      created_at: notification.created_at,
    });
  }

  return notification;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN NOTIFICATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notify ALL admin users about a system event.
 * Used internally when something important happens that admins should know about.
 *
 * @param {{ message: string, type?: string, io?: any }} opts
 */
export const notifyAdmins = async ({ message, type = 'INFO', io }) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', is_blocked: false },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      user_id: admin.id,
      message,
      type: /** @type {any} */ (type),
    })),
  });

  if (io) {
    admins.forEach((admin) => {
      io.to(`user:${admin.id}`).emit('notification', {
        message,
        type,
        is_read: false,
        created_at: new Date(),
      });
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BROADCAST TO ALL USERS (admin action)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin broadcasts a system-wide notification to all non-blocked users.
 *
 * @param {{ message: string, type?: string, io?: any }} opts
 */
export const broadcastNotification = async ({ message, type = 'SYSTEM', io }) => {
  if (!message || message.trim().length < 5) {
    throw new AppError('Broadcast message must be at least 5 characters', 400);
  }

  const users = await prisma.user.findMany({
    where: { is_blocked: false },
    select: { id: true },
  });

  if (users.length === 0) return { count: 0 };

  const result = await prisma.notification.createMany({
    data: users.map((u) => ({
      user_id: u.id,
      message: message.trim(),
      type: /** @type {any} */ (type),
    })),
  });

  if (io) {
    // Broadcast to all connected sockets
    io.emit('notification', {
      message: message.trim(),
      type,
      is_read: false,
      created_at: new Date(),
    });
  }

  return { count: result.count };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY NOTIFICATIONS (Student / Admin dashboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get paginated notifications for the logged-in user.
 *
 * Supported filters:
 *   ?is_read=true|false
 *   ?type=INFO|ALERT|SYSTEM
 *   ?page=1&limit=20
 *
 * Response includes unread count for badge display.
 */
export const getMyNotifications = async (userId, query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 15));
  const skip = (page - 1) * limit;

  const where = { user_id: userId };

  // Filter by read status
  if (query.is_read === 'true') where.is_read = true;
  else if (query.is_read === 'false') where.is_read = false;

  // Filter by type
  const validTypes = ['INFO', 'ALERT', 'SYSTEM', 'REMINDER', 'RESERVATION', 'WISHLIST', 'NEW_BOOK', 'OVERDUE'];
  if (query.type && validTypes.includes(query.type.toUpperCase())) {
    where.type = /** @type {any} */ (query.type.toUpperCase());
  }

  const [notifications, total, unreadCount, alertCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    prisma.notification.count({ where: { user_id: userId, type: 'ALERT', is_read: false } }),
  ]);

  return {
    notifications,
    unreadCount,
    alertCount, // unread ALERT type – for red badge on dashboard
    meta: paginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL NOTIFICATIONS (Admin overview)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin view of all system notifications with user context.
 *
 * Supports:
 *   ?user_id=uuid     – filter by user
 *   ?type=INFO|ALERT|SYSTEM
 *   ?is_read=true|false
 *   ?page=1&limit=20
 */
export const getAllNotifications = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.user_id) where.user_id = query.user_id;
  if (query.is_read === 'true') where.is_read = true;
  else if (query.is_read === 'false') where.is_read = false;

  const validTypes = ['INFO', 'ALERT', 'SYSTEM', 'REMINDER', 'RESERVATION', 'WISHLIST', 'NEW_BOOK', 'OVERDUE'];
  if (query.type && validTypes.includes(query.type.toUpperCase())) {
    where.type = /** @type {any} */ (query.type.toUpperCase());
  }

  const [notifications, total, statsResult] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.notification.count({ where }),
    // Admin summary stats
    prisma.notification.groupBy({
      by: ['type'],
      _count: { type: true },
    }),
  ]);

  const typeStats = statsResult.reduce((acc, r) => {
    acc[r.type] = r._count.type;
    return acc;
  }, {});

  return {
    notifications,
    typeStats,
    meta: paginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// MARK AS READ
// ─────────────────────────────────────────────────────────────────────────────

/** Mark a single notification as read. Ownership-checked. */
export const markAsRead = async (id, userId) => {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) throw new AppError('Notification not found', 404);
  if (notif.user_id !== userId) throw new AppError('Forbidden: not your notification', 403);
  if (notif.is_read) return notif; // already read, no-op

  return prisma.notification.update({
    where: { id },
    data: { is_read: true },
  });
};

/** Mark all unread notifications for a user as read. Returns count. */
export const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
  return { updated: result.count };
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/** Delete a single notification. Ownership-checked (admin can delete any). */
export const deleteNotification = async (id, user) => {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) throw new AppError('Notification not found', 404);
  if (user.role !== 'ADMIN' && notif.user_id !== user.id) {
    throw new AppError('Forbidden: not your notification', 403);
  }
  return prisma.notification.delete({ where: { id } });
};

/** Delete all read notifications for current user (inbox cleanup). */
export const deleteAllRead = async (userId) => {
  const result = await prisma.notification.deleteMany({
    where: { user_id: userId, is_read: true },
  });
  return { deleted: result.count };
};
