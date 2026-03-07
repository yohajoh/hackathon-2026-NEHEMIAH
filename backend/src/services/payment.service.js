/**
 * Payment Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles fine payments via Chapa payment gateway and CASH.
 *
 * Flow:
 *   1. Student initiates payment → gets Chapa checkout URL
 *   2. Chapa calls /webhook with payment outcome
 *   3. On SUCCESS: rental status → COMPLETED, admin notified
 *   4. On FAILURE: notification sent, student can retry
 *
 * Also supports CASH payments (admin records offline).
 */
/* eslint-disable n/no-unsupported-features/node-builtins */

import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';
import { createNotification, notifyAdmins } from './notification.service.js';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Generate unique transaction reference */
const generateTxRef = (_userId) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `BRANA-${timestamp}-${random}`;
};

const initializeChapaPayment = async ({
  amount,
  email,
  firstName,
  lastName,
  txRef,
  rentalId,
}) => {
  const chapaSecret = process.env.CHAPA_SECRET_KEY;
  if (!chapaSecret) {
    return {
      checkout_url: `https://checkout.chapa.co/checkout/payment/${txRef}`,
    };
  }

  const callbackUrl =
    process.env.CHAPA_WEBHOOK_URL || `${process.env.BACKEND_URL || "http://localhost:5000"}/api/payments/webhook`;
  const returnUrl = process.env.CHAPA_RETURN_URL || process.env.FRONTEND_URL || "http://localhost:3000";

  const payload = {
    amount: Number(amount).toFixed(2),
    currency: "ETB",
    email,
    first_name: firstName || "Student",
    last_name: lastName || "User",
    tx_ref: txRef,
    callback_url: callbackUrl,
    return_url: returnUrl,
    customization: {
      title: "Brana Fine Payment",
      description: `Fine payment for rental ${rentalId}`,
    },
  };

  const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chapaSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok || result?.status === "failed") {
    throw new AppError(result?.message || "Failed to initialize Chapa payment", 502);
  }

  return result?.data || {};
};

/** Verify Chapa HMAC signature */
const verifySignature = (payload, signature) => {
  const secret = process.env.CHAPA_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev if not set

  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return computed === signature;
};

const PAYMENT_INCLUDE = {
  rental: {
    include: {
      user: { select: { id: true, name: true, email: true, student_id: true } },
      physical_book: { select: { id: true, title: true } },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INITIATE PAYMENT (Student)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initiate a fine payment for a rental.
 * Only allowed if rental has fine > 0 and status = PENDING.
 *
 * Returns: { payment, chapaUrl } or { payment, message } for CASH type.
 */
export const initiatePayment = async (rentalId, userId, { method = 'CHAPA' } = {}, io) => {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      physical_book: { select: { id: true, title: true } },
      payment: true,
    },
  });

  if (!rental) throw new AppError('Rental not found', 404);
  if (rental.user_id !== userId) throw new AppError('This is not your rental', 403);
  if (rental.status !== 'PENDING') {
    throw new AppError(
      'Payment can only be initiated for rentals with a pending fine (PENDING status)',
      400
    );
  }
  if (!rental.fine || Number(rental.fine) <= 0) {
    throw new AppError('No fine is due for this rental', 400);
  }

  // Only one payment per rental
  if (rental.payment) {
    if (rental.payment.status === 'SUCCESS') {
      throw new AppError('Fine has already been paid successfully', 409);
    }
    if (rental.payment.status === 'PENDING') {
      // Return existing pending payment
      return {
        payment: rental.payment,
        chapaUrl: `https://checkout.chapa.co/checkout/payment/${rental.payment.tx_ref}`,
        message: 'Payment already initiated. Use the existing checkout link.',
      };
    }
    // FAILED → allow retry: update existing payment
    const tx_ref = generateTxRef(userId);
    const updated = await prisma.payment.update({
      where: { id: rental.payment.id },
      data: { tx_ref, status: 'PENDING', paid_at: new Date() },
    });
    const chapaUrl = `https://checkout.chapa.co/checkout/payment/${tx_ref}`;
    return { payment: updated, chapaUrl, message: 'Retrying payment.' };
  }

  const validMethods = ['CHAPA', 'CASH'];
  const paymentMethod = method.toUpperCase();
  if (!validMethods.includes(paymentMethod)) {
    throw new AppError('Payment method must be CHAPA or CASH', 400);
  }

  const tx_ref = generateTxRef(userId);

  const payment = await prisma.payment.create({
    data: {
      rental_id: rentalId,
      tx_ref,
      amount: rental.fine,
      method: /** @type {any} */ (paymentMethod),
      status: 'PENDING',
      paid_at: new Date(),
    },
    include: PAYMENT_INCLUDE,
  });

  // Notify student
  await createNotification({
    userId,
    message: `💳 Fine payment initiated for "${rental.physical_book.title}". Amount: ${Number(rental.fine).toFixed(2)} ETB. Please complete payment.`,
    type: 'INFO',
    io,
  });

  if (paymentMethod === 'CASH') {
    return {
      payment,
      message: 'Please visit the library desk to pay your fine in cash.',
    };
  }

  const chapaData = await initializeChapaPayment({
    amount: rental.fine,
    email: rental.user.email,
    firstName: rental.user.name?.split(" ")?.[0] || "Student",
    lastName: rental.user.name?.split(" ")?.slice(1).join(" ") || "User",
    txRef: tx_ref,
    rentalId,
  });
  const chapaUrl = chapaData.checkout_url || `https://checkout.chapa.co/checkout/payment/${tx_ref}`;

  return { payment, chapaUrl };
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAPA WEBHOOK (Public)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chapa posts payment result here.
 * Signature verified via HMAC.
 * On SUCCESS: finalize rental as COMPLETED, notify student and admin.
 * On FAILURE: notify student to retry.
 */
export const handleWebhook = async (rawPayload, payload, signature, io) => {
  // Verify signature
  if (!verifySignature(rawPayload, signature)) {
    throw new AppError('Invalid webhook signature', 401);
  }

  const normalized = payload?.data ? payload.data : payload;
  const tx_ref = normalized?.tx_ref || normalized?.trx_ref || normalized?.reference;
  const status = normalized?.status;
  if (!tx_ref) throw new AppError('Missing tx_ref in webhook payload', 400);

  const payment = await prisma.payment.findUnique({
    where: { tx_ref },
    include: PAYMENT_INCLUDE,
  });
  if (!payment) throw new AppError(`Payment not found for tx_ref: ${tx_ref}`, 404);

  // Idempotency: ignore if already processed
  if (payment.status === 'SUCCESS') {
    return { message: 'Already processed', payment };
  }

  const isSuccess = status?.toLowerCase() === 'success';
  const newPaymentStatus = isSuccess ? 'SUCCESS' : 'FAILED';

  // Atomic update: payment + rental
  const updated = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { tx_ref },
      data: {
        status: /** @type {any} */ (newPaymentStatus),
        paid_at: new Date(),
      },
      include: PAYMENT_INCLUDE,
    });

    if (isSuccess) {
      await tx.rental.update({
        where: { id: payment.rental_id },
        data: { status: 'COMPLETED' },
      });
    }

    return updatedPayment;
  });

  const rental = payment.rental;
  const userId = rental.user_id;
  const bookTitle = rental.physical_book.title;
  const amount = Number(payment.amount).toFixed(2);

  if (isSuccess) {
    // Student notification – payment success
    await createNotification({
      userId,
      message: `✅ Payment of ${amount} ETB for "${bookTitle}" was successful. Your rental is now fully completed. Thank you!`,
      type: 'INFO',
      io,
    });

    // Admin notification
    await notifyAdmins({
      message: `💰 ${rental.user.name} paid ${amount} ETB fine for "${bookTitle}". Rental #${payment.rental_id} is now COMPLETED.`,
      type: 'INFO',
      io,
    });
  } else {
    // Student notification – payment failed
    await createNotification({
      userId,
      message: `❌ Payment of ${amount} ETB for "${bookTitle}" failed (tx_ref: ${tx_ref}). Please try again from your rental history.`,
      type: 'ALERT',
      io,
    });
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: RECORD CASH PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin manually marks a cash payment as successful.
 * Used when student pays in person.
 */
export const recordCashPayment = async (paymentId, adminId, io) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: PAYMENT_INCLUDE,
  });
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status === 'SUCCESS') {
    throw new AppError('Payment has already been recorded as successful', 409);
  }
  if (payment.method !== 'CASH') {
    throw new AppError('This endpoint is only for CASH payments. Use the Chapa webhook for online payments.', 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'SUCCESS', paid_at: new Date() },
      include: PAYMENT_INCLUDE,
    });
    await tx.rental.update({
      where: { id: payment.rental_id },
      data: { status: 'COMPLETED' },
    });
    return updatedPayment;
  });

  const userId = payment.rental.user_id;
  const bookTitle = payment.rental.physical_book.title;

  // Notify student
  await createNotification({
    userId,
    message: `✅ Your cash payment of ${Number(payment.amount).toFixed(2)} ETB for "${bookTitle}" has been recorded by the librarian. Rental completed!`,
    type: 'INFO',
    io,
  });

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// MY PAYMENTS (Student dashboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Student's payment history.
 * Query:
 *   ?status=PENDING|SUCCESS|FAILED
 *   ?page=1&limit=10
 */
export const getMyPayments = async (userId, query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = /** @type {any} */ ({ rental: { user_id: userId } });
  if (query.status) {
    const s = query.status.toUpperCase();
    if (['PENDING', 'SUCCESS', 'FAILED'].includes(s)) where.status = s;
  }

  const [payments, total, totals] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paid_at: 'desc' },
      skip,
      take: limit,
      include: {
        rental: {
          select: {
            id: true, loan_date: true, due_date: true, return_date: true, status: true,
            physical_book: { select: { id: true, title: true, cover_image_url: true } },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { rental: { user_id: userId }, status: 'SUCCESS' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    payments,
    summary: {
      totalPaid: Number(totals._sum.amount ?? 0),
      paymentCount: totals._count.id,
    },
    meta: paginationMeta(total, page, limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL PAYMENTS (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin view of all payments with revenue stats.
 *
 * Query:
 *   ?status=PENDING|SUCCESS|FAILED
 *   ?method=CHAPA|CASH
 *   ?search=        – student name or email
 *   ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 *   ?page=1&limit=20
 */
export const getAllPayments = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = /** @type {any} */ ({});

  if (query.status) {
    const s = query.status.toUpperCase();
    if (['PENDING', 'SUCCESS', 'FAILED'].includes(s)) where.status = s;
  }
  if (query.method) {
    const m = query.method.toUpperCase();
    if (['CHAPA', 'CASH'].includes(m)) where.method = m;
  }

  // Date range filter
  if (query.start_date || query.end_date) {
    where.paid_at = {};
    if (query.start_date) where.paid_at.gte = new Date(query.start_date);
    if (query.end_date) {
      const end = new Date(query.end_date);
      end.setHours(23, 59, 59, 999);
      where.paid_at.lte = end;
    }
  }

  if (query.search) {
    const q = query.search.trim();
    where.rental = {
      user: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
    };
  }

  const [payments, total, revenueStats] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paid_at: 'desc' },
      skip,
      take: limit,
      include: PAYMENT_INCLUDE,
    }),
    prisma.payment.count({ where }),
    // Revenue breakdown for the current filter
    prisma.payment.aggregate({
      where: { ...where, status: 'SUCCESS' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    payments,
    revenue: {
      total: Number(revenueStats._sum.amount ?? 0),
      count: revenueStats._count.id,
    },
    meta: paginationMeta(total, page, limit),
  };
};
