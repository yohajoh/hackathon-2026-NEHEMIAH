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

const NOTIFICATION_SELECT = {
  id: true,
  user_id: true,
  message: true,
  type: true,
  is_read: true,
  created_at: true,
};

const isMissingColumnError = (error) =>
  error?.code === 'P2022' || /column .* does not exist/i.test(String(error?.message || ''));

// ─────────────────────────────────────────────────────────────────────────────
// CORE NOTIFICATION CREATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a notification for a specific user and emit it via Socket.io.
 * This is used internally by all other services.
 *
 * @param {{ userId: string, message: string, type?: string, io?: any, dedupeKey?: string|null }} opts
 */
export const createNotification = async ({ userId, message, type = 'INFO', io, dedupeKey = null }) => {
  // Check if user has notifications enabled (via global system config)
  // We skip this check here and let callers decide – it keeps this fn fast.

  const data = {
    user_id: userId,
    message,
    type: /** @type {any} */ (type),
  };

  let notification;
  try {
    notification = await prisma.notification.create({
      data: dedupeKey ? { ...data, dedupe_key: dedupeKey } : data,
      select: NOTIFICATION_SELECT,
    });
  } catch (error) {
    // Duplicate dedupe key means this notification was already created.
    if (error?.code === 'P2002' && dedupeKey) {
      return null;
    }
    // Backward compatibility: DB schema may not yet have dedupe_key column.
    if (dedupeKey && isMissingColumnError(error)) {
      notification = await prisma.notification.create({
        data,
        select: NOTIFICATION_SELECT,
      });
    } else {
      throw error;
    }
  }

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
      select: NOTIFICATION_SELECT,
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
      select: {
        ...NOTIFICATION_SELECT,
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

/** Mark a single notification as read. Ownership-checked. Admins can mark any notification. */
export const markAsRead = async (id, userId, userRole = 'USER') => {
  const notif = await prisma.notification.findUnique({
    where: { id },
    select: {
      id: true,
      user_id: true,
      is_read: true,
    },
  });
  if (!notif) throw new AppError('Notification not found', 404);
  // Admins can mark any notification as read
  if (userRole !== 'ADMIN' && notif.user_id !== userId) {
    throw new AppError('Forbidden: not your notification', 403);
  }
  if (notif.is_read) return notif; // already read, no-op

  return prisma.notification.update({
    where: { id },
    data: { is_read: true },
    select: NOTIFICATION_SELECT,
  });
};

/** Mark multiple notifications as read in a single batch query. */
export const markMultipleAsRead = async (ids, userId) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { updated: 0 };
  }

  const result = await prisma.notification.updateMany({
    where: {
      id: { in: ids },
      user_id: userId,
      is_read: false,
    },
    data: { is_read: true },
  });

  return { updated: result.count };
};

/** View a notification and automatically mark it as read. Optimized single-query approach. */
export const viewNotification = async (id, userId) => {
  const notif = await prisma.notification.findUnique({
    where: { id },
    select: NOTIFICATION_SELECT,
  });

  if (!notif) throw new AppError('Notification not found', 404);
  if (notif.user_id !== userId) throw new AppError('Forbidden: not your notification', 403);

  if (!notif.is_read) {
    await prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });
    return { ...notif, is_read: true };
  }

  return notif;
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
  const notif = await prisma.notification.findUnique({
    where: { id },
    select: {
      id: true,
      user_id: true,
    },
  });
  if (!notif) throw new AppError('Notification not found', 404);
  if (user.role !== 'ADMIN' && notif.user_id !== user.id) {
    throw new AppError('Forbidden: not your notification', 403);
  }
  return prisma.notification.delete({
    where: { id },
    select: NOTIFICATION_SELECT,
  });
};

/** Delete all read notifications for current user (inbox cleanup). */
export const deleteAllRead = async (userId) => {
  const result = await prisma.notification.deleteMany({
    where: { user_id: userId, is_read: true },
  });
  return { deleted: result.count };
};
