/**
 * System Configuration Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages global library settings (max loan days, daily fine, max books per user).
 *
 * There is always exactly ONE config row, seeded on first use.
 * Admins can update it; changes take effect immediately for new rentals.
 */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { notifyAdmins } from './notification.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const getConfig = async () => {
  const config = await prisma.systemConfig.findFirst({
    orderBy: { id: 'desc' },
    include: {
      updated_by_user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!config) {
    throw new AppError(
      'System configuration has not been initialized. Please contact the system administrator.',
      503
    );
  }

  return config;
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CONFIG (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update or seed system config.
 *
 * Body:
 *   max_loan_days       – integer 1-365
 *   daily_fine          – decimal 0.00-1000
 *   max_books_per_user  – integer 1-20
 *   enable_notifications – boolean
 *
 * Uses upsert – if no config exists, creates it.
 * Notifies all admins after update.
 */
export const updateConfig = async (adminId, data, io) => {
  const {
    max_loan_days,
    daily_fine,
    max_books_per_user,
    reservation_window_hr,
    low_stock_threshold,
    enable_notifications,
  } = data;

  // Validate
  const maxDays = parseInt(max_loan_days, 10);
  const dailyFineNum = parseFloat(daily_fine);
  const maxBooks = parseInt(max_books_per_user, 10);
  const reservationWindow = parseInt(reservation_window_hr, 10);
  const lowStockThreshold = parseInt(low_stock_threshold, 10);

  if (max_loan_days !== undefined) {
    if (isNaN(maxDays) || maxDays < 1 || maxDays > 365) {
      throw new AppError('max_loan_days must be between 1 and 365', 400);
    }
  }
  if (daily_fine !== undefined) {
    if (isNaN(dailyFineNum) || dailyFineNum < 0 || dailyFineNum > 10000) {
      throw new AppError('daily_fine must be between 0 and 10000', 400);
    }
  }
  if (max_books_per_user !== undefined) {
    if (isNaN(maxBooks) || maxBooks < 1 || maxBooks > 20) {
      throw new AppError('max_books_per_user must be between 1 and 20', 400);
    }
  }
  if (reservation_window_hr !== undefined) {
    if (isNaN(reservationWindow) || reservationWindow < 1 || reservationWindow > 168) {
      throw new AppError('reservation_window_hr must be between 1 and 168', 400);
    }
  }
  if (low_stock_threshold !== undefined) {
    if (isNaN(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 50) {
      throw new AppError('low_stock_threshold must be between 0 and 50', 400);
    }
  }

  const existing = await prisma.systemConfig.findFirst({ orderBy: { id: 'desc' } });

  let config;
  if (!existing) {
    // Seed initial config
    if (max_loan_days === undefined || daily_fine === undefined || max_books_per_user === undefined) {
      throw new AppError(
        'Initial configuration requires max_loan_days, daily_fine, and max_books_per_user',
        400
      );
    }
    config = await prisma.systemConfig.create({
      data: {
        max_loan_days: maxDays,
        daily_fine: dailyFineNum,
        max_books_per_user: maxBooks,
        reservation_window_hr: reservationWindow || 24,
        low_stock_threshold: lowStockThreshold || 2,
        enable_notifications: enable_notifications !== undefined ? Boolean(enable_notifications) : true,
        last_updated_by_id: adminId,
      },
      include: { updated_by_user: { select: { id: true, name: true, email: true } } },
    });
  } else {
    const updateData = /** @type {Record<string, any>} */ ({
      last_updated_by_id: adminId,
    });
    if (max_loan_days !== undefined) updateData.max_loan_days = maxDays;
    if (daily_fine !== undefined) updateData.daily_fine = dailyFineNum;
    if (max_books_per_user !== undefined) updateData.max_books_per_user = maxBooks;
    if (reservation_window_hr !== undefined) updateData.reservation_window_hr = reservationWindow;
    if (low_stock_threshold !== undefined) updateData.low_stock_threshold = lowStockThreshold;
    if (enable_notifications !== undefined) updateData.enable_notifications = Boolean(enable_notifications);

    config = await prisma.systemConfig.update({
      where: { id: existing.id },
      data: updateData,
      include: { updated_by_user: { select: { id: true, name: true, email: true } } },
    });
  }

  // Notify other admins
  await notifyAdmins({
    message: `⚙️ System configuration updated by ${config.updated_by_user.name}. Max loan: ${config.max_loan_days}d | Fine: ${Number(config.daily_fine).toFixed(2)} ETB/day | Max books: ${config.max_books_per_user}.`,
    type: 'SYSTEM',
    io,
  });

  return config;
};
