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

import { prisma } from "../prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { paginationMeta } from "../utils/apiFeatures.js";
import { createNotification, notifyAdmins } from "./notification.service.js";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Generate unique transaction reference */
const generateTxRef = (_userId) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `BRANA-${timestamp}-${random}`;
};

const formatChapaErrorMessage = (message) => {
  if (!message) return "Failed to initialize Chapa payment";
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "object") {
    const parts = Object.entries(message).map(([field, value]) => {
      if (Array.isArray(value)) return `${field}: ${value.join(", ")}`;
      return `${field}: ${String(value)}`;
    });
    return parts.join(" | ");
  }
  return String(message);
};

const sanitizeChapaText = (value, fallback) => {
  const text = String(value || fallback || "");
  const cleaned = text
    .replace(/[^A-Za-z0-9._\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
};

const initializeChapaPayment = async ({ amount, email, firstName, lastName, txRef, rentalId, title, description }) => {
  const chapaSecret = process.env.CHAPA_SECRET_KEY;
  if (!chapaSecret) {
    return {
      checkout_url: `https://checkout.chapa.co/checkout/payment/${txRef}`,
    };
  }

  const callbackUrl =
    process.env.CHAPA_WEBHOOK_URL || `${process.env.BACKEND_URL || "http://localhost:5000"}/api/payments/webhook`;
  const returnUrlBase = process.env.CHAPA_RETURN_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  let returnUrl;
  try {
    const url = new URL(returnUrlBase);
    url.searchParams.set("tx_ref", txRef);
    returnUrl = url.toString();
  } catch {
    const joiner = returnUrlBase.includes("?") ? "&" : "?";
    returnUrl = `${returnUrlBase}${joiner}tx_ref=${encodeURIComponent(txRef)}`;
  }
  const safeTitle = sanitizeChapaText(title, "Brana Payment").slice(0, 16);
  const safeDescription = sanitizeChapaText(description, `Payment for rental ${rentalId}`);

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
      title: safeTitle,
      description: safeDescription,
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
    const message = formatChapaErrorMessage(result?.message);
    throw new AppError(message, 502);
  }

  return result?.data || {};
};

/** Verify Chapa HMAC signature */
const verifySignature = (payload, signature) => {
  const secret = process.env.CHAPA_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev if not set

  const rawBody = typeof payload === "string" ? payload : JSON.stringify(payload);
  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return computed === signature;
};

const PAYMENT_INCLUDE = {
  rental: {
    include: {
      user: { select: { id: true, name: true, email: true, student_id: true } },
      physical_book: { select: { id: true, title: true, rental_price: true } },
    },
  },
};

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const getOutstandingFineRentals = async (userId, excludeRentalId = null) => {
  const rentals = await prisma.rental.findMany({
    where: {
      user_id: userId,
      status: "PENDING",
      fine: { gt: 0 },
      return_date: { not: null },
      ...(excludeRentalId ? { id: { not: excludeRentalId } } : {}),
    },
    select: {
      id: true,
      fine: true,
      physical_book: { select: { title: true } },
    },
  });

  const total = roundMoney(rentals.reduce((sum, item) => sum + Number(item.fine || 0), 0));
  return { rentals, total };
};

export const getMyDebtSummary = async (userId) => {
  const { rentals, total } = await getOutstandingFineRentals(userId);
  return {
    totalDebt: total,
    hasDebt: total > 0,
    count: rentals.length,
    overdueFines: rentals.map((item) => ({
      rental_id: item.id,
      amount: roundMoney(item.fine),
      book_title: item.physical_book?.title || "Book",
    })),
  };
};

const settlePaymentSuccessEffects = async (tx, payment) => {
  const context = payment.context || "FINE";
  if (context === "FINE") {
    if (payment.rental.status === "PENDING" && Number(payment.rental.fine || 0) > 0) {
      await tx.rental.update({
        where: { id: payment.rental_id },
        data: { status: "COMPLETED" },
      });
    }
    return;
  }

  const debtIds = Array.isArray(payment.debt_rental_ids) ? payment.debt_rental_ids : [];
  if (debtIds.length === 0) return;

  await tx.rental.updateMany({
    where: {
      id: { in: debtIds },
      user_id: payment.rental.user_id,
      status: "PENDING",
    },
    data: { status: "COMPLETED" },
  });
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
export const initiatePayment = async (rentalId, userId, { method = "CHAPA", context = "FINE" } = {}, io) => {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      physical_book: { select: { id: true, title: true, rental_price: true } },
      payment: true,
    },
  });

  if (!rental) throw new AppError("Rental not found", 404);
  if (rental.user_id !== userId) throw new AppError("This is not your rental", 403);
  const normalizedContext = String(context || "FINE").toUpperCase();
  const isBorrowPayment = normalizedContext === "BORROW";

  let payableAmount = 0;
  let rentalCharge = null;
  let debtAmount = null;
  let debtRentalIds = [];

  if (isBorrowPayment) {
    if (rental.status !== "BORROWED") {
      throw new AppError("Borrow payment can only be initiated for BORROWED rentals", 400);
    }

    rentalCharge = roundMoney(Number(rental.physical_book?.rental_price || 0));
    if (rentalCharge <= 0) {
      throw new AppError("Book rental price is invalid. Please contact admin.", 400);
    }

    const outstandingDebt = await getOutstandingFineRentals(userId, rentalId);
    debtAmount = outstandingDebt.total;
    debtRentalIds = outstandingDebt.rentals.map((entry) => entry.id);
    payableAmount = roundMoney(rentalCharge + debtAmount);
  } else {
    if (rental.status !== "PENDING") {
      throw new AppError("Payment can only be initiated for rentals with a pending fine (PENDING status)", 400);
    }
    if (!rental.fine || Number(rental.fine) <= 0) {
      throw new AppError("No fine is due for this rental", 400);
    }
    payableAmount = roundMoney(Number(rental.fine));
    debtAmount = 0;
    debtRentalIds = [];
  }

  const validMethods = ["CHAPA", "CASH"];
  const paymentMethod = String(method || "CHAPA").toUpperCase();
  if (!validMethods.includes(paymentMethod)) {
    throw new AppError("Payment method must be CHAPA or CASH", 400);
  }

  // Only one payment per rental
  if (rental.payment) {
    if (rental.payment.status === "SUCCESS" && rental.payment.context === (isBorrowPayment ? "BORROW" : "FINE")) {
      throw new AppError(
        isBorrowPayment ? "Borrow payment has already been completed" : "Fine has already been paid successfully",
        409,
      );
    }
    if (rental.payment.status === "PENDING") {
      // Re-issue a fresh tx_ref + checkout URL because prior checkout links can expire.
      const tx_ref = generateTxRef(userId);
      const updated = await prisma.payment.update({
        where: { id: rental.payment.id },
        data: {
          tx_ref,
          amount: payableAmount,
          context: isBorrowPayment ? "BORROW" : "FINE",
          rental_charge: rentalCharge,
          debt_amount: debtAmount,
          debt_rental_ids: debtRentalIds,
          method: /** @type {any} */ (paymentMethod),
          status: "PENDING",
          paid_at: new Date(),
        },
      });

      if (paymentMethod === "CASH") {
        return {
          payment: updated,
          message: isBorrowPayment
            ? "Please visit the library desk to record your borrow payment in cash."
            : "Please visit the library desk to pay your fine in cash.",
        };
      }

      const chapaData = await initializeChapaPayment({
        amount: payableAmount,
        email: rental.user.email,
        firstName: rental.user.name?.split(" ")?.[0] || "Student",
        lastName: rental.user.name?.split(" ")?.slice(1).join(" ") || "User",
        txRef: tx_ref,
        rentalId,
        title: isBorrowPayment ? "Borrow Payment" : "Fine Payment",
        description: isBorrowPayment
          ? `Borrow payment for ${rental.physical_book.title}`
          : `Fine payment for rental ${rentalId}`,
      });
      const chapaUrl = chapaData.checkout_url || `https://checkout.chapa.co/checkout/payment/${tx_ref}`;
      return { payment: updated, chapaUrl, message: "Payment checkout refreshed." };
    }
    // FAILED → allow retry: update existing payment
    const tx_ref = generateTxRef(userId);
    const updated = await prisma.payment.update({
      where: { id: rental.payment.id },
      data: {
        tx_ref,
        amount: payableAmount,
        context: isBorrowPayment ? "BORROW" : "FINE",
        rental_charge: rentalCharge,
        debt_amount: debtAmount,
        debt_rental_ids: debtRentalIds,
        method: /** @type {any} */ (method.toUpperCase()),
        status: "PENDING",
        paid_at: new Date(),
      },
    });

    if (method.toUpperCase() === "CASH") {
      return {
        payment: updated,
        message: isBorrowPayment
          ? "Please visit the library desk to record your borrow payment in cash."
          : "Please visit the library desk to pay your fine in cash.",
      };
    }

    const chapaData = await initializeChapaPayment({
      amount: payableAmount,
      email: rental.user.email,
      firstName: rental.user.name?.split(" ")?.[0] || "Student",
      lastName: rental.user.name?.split(" ")?.slice(1).join(" ") || "User",
      txRef: tx_ref,
      rentalId,
      title: isBorrowPayment ? "Borrow Payment" : "Fine Payment",
      description: isBorrowPayment
        ? `Borrow payment for "${rental.physical_book.title}"`
        : `Fine payment for rental ${rentalId}`,
    });
    const chapaUrl = chapaData.checkout_url || `https://checkout.chapa.co/checkout/payment/${tx_ref}`;
    return { payment: updated, chapaUrl, message: "Retrying payment." };
  }

  const tx_ref = generateTxRef(userId);

  const payment = await prisma.payment.create({
    data: {
      rental_id: rentalId,
      tx_ref,
      amount: payableAmount,
      context: isBorrowPayment ? "BORROW" : "FINE",
      rental_charge: rentalCharge,
      debt_amount: debtAmount,
      debt_rental_ids: debtRentalIds,
      method: /** @type {any} */ (paymentMethod),
      status: "PENDING",
      paid_at: new Date(),
    },
    include: PAYMENT_INCLUDE,
  });

  // Notify student
  await createNotification({
    userId,
    message: isBorrowPayment
      ? `💳 Borrow checkout started for "${rental.physical_book.title}". Amount: ${payableAmount.toFixed(2)} ETB${debtAmount > 0 ? ` (includes ${debtAmount.toFixed(2)} ETB debt)` : ""}. Please complete payment.`
      : `💳 Fine payment initiated for "${rental.physical_book.title}". Amount: ${payableAmount.toFixed(2)} ETB. Please complete payment.`,
    type: "INFO",
    io,
  });

  if (paymentMethod === "CASH") {
    return {
      payment,
      message: isBorrowPayment
        ? "Please visit the library desk to record your borrow payment in cash."
        : "Please visit the library desk to pay your fine in cash.",
    };
  }

  const chapaData = await initializeChapaPayment({
    amount: payableAmount,
    email: rental.user.email,
    firstName: rental.user.name?.split(" ")?.[0] || "Student",
    lastName: rental.user.name?.split(" ")?.slice(1).join(" ") || "User",
    txRef: tx_ref,
    rentalId,
    title: isBorrowPayment ? "Borrow Payment" : "Fine Payment",
    description: isBorrowPayment
      ? `Borrow payment for "${rental.physical_book.title}"`
      : `Fine payment for rental ${rentalId}`,
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
    throw new AppError("Invalid webhook signature", 401);
  }

  const normalized = payload?.data ? payload.data : payload;
  const tx_ref = normalized?.tx_ref || normalized?.trx_ref || normalized?.reference;
  const status = normalized?.status;
  const paidAmount = Number(normalized?.amount ?? normalized?.data?.amount ?? normalized?.charged_amount ?? NaN);
  if (!tx_ref) throw new AppError("Missing tx_ref in webhook payload", 400);

  const payment = await prisma.payment.findUnique({
    where: { tx_ref },
    include: PAYMENT_INCLUDE,
  });
  if (!payment) throw new AppError(`Payment not found for tx_ref: ${tx_ref}`, 404);

  // Idempotency: ignore if already processed
  if (payment.status === "SUCCESS") {
    return { message: "Already processed", payment };
  }

  const isSuccess = status?.toLowerCase() === "success";
  const newPaymentStatus = isSuccess ? "SUCCESS" : "FAILED";
  const expectedAmount = roundMoney(payment.amount);
  const hasAmountMismatch = Number.isFinite(paidAmount) && roundMoney(paidAmount) !== expectedAmount;
  const context = payment.context || "FINE";
  const isFinePayment = context === "FINE";

  if (isSuccess && hasAmountMismatch) {
    const mismatch = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", paid_at: new Date() },
      include: PAYMENT_INCLUDE,
    });

    await createNotification({
      userId: payment.rental.user_id,
      message: `❌ Payment amount mismatch for "${payment.rental.physical_book.title}". Expected ${expectedAmount.toFixed(2)} ETB. Please retry payment.`,
      type: "ALERT",
      io,
    });

    return mismatch;
  }

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
      await settlePaymentSuccessEffects(tx, updatedPayment);
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
      message: isFinePayment
        ? `✅ Payment of ${amount} ETB for "${bookTitle}" was successful. Your rental is now fully completed. Thank you!`
        : `✅ Payment of ${amount} ETB for "${bookTitle}" was successful. You can continue using your borrowed book.`,
      type: "INFO",
      io,
    });

    // Admin notification
    await notifyAdmins({
      message: isFinePayment
        ? `💰 ${rental.user.name} paid ${amount} ETB fine for "${bookTitle}". Rental #${payment.rental_id} is now COMPLETED.`
        : `💰 ${rental.user.name} paid ${amount} ETB borrow checkout for "${bookTitle}"${Number(payment.debt_amount || 0) > 0 ? ` and settled ${Number(payment.debt_amount).toFixed(2)} ETB debt` : ""}.`,
      type: "INFO",
      io,
    });
  } else {
    // Student notification – payment failed
    await createNotification({
      userId,
      message: `❌ Payment of ${amount} ETB for "${bookTitle}" failed (tx_ref: ${tx_ref}). Please try again from your rental history.`,
      type: "ALERT",
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
  if (!payment) throw new AppError("Payment not found", 404);
  if (payment.status === "SUCCESS") {
    throw new AppError("Payment has already been recorded as successful", 409);
  }
  if (payment.method !== "CASH") {
    throw new AppError("This endpoint is only for CASH payments. Use the Chapa webhook for online payments.", 400);
  }

  const isFinePayment = (payment.context || "FINE") === "FINE";
  const updated = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "SUCCESS", paid_at: new Date() },
      include: PAYMENT_INCLUDE,
    });
    await settlePaymentSuccessEffects(tx, updatedPayment);
    return updatedPayment;
  });

  const userId = payment.rental.user_id;
  const bookTitle = payment.rental.physical_book.title;

  // Notify student
  await createNotification({
    userId,
    message: isFinePayment
      ? `✅ Your cash payment of ${Number(payment.amount).toFixed(2)} ETB for "${bookTitle}" has been recorded by the librarian. Rental completed!`
      : `✅ Your cash payment of ${Number(payment.amount).toFixed(2)} ETB for "${bookTitle}" has been recorded by the librarian.`,
    type: "INFO",
    io,
  });

  return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY PAYMENT BY TX REF (Student/Admin)
// ─────────────────────────────────────────────────────────────────────────────
export const verifyPaymentByTxRef = async (txRef, user, io) => {
  const payment = await prisma.payment.findUnique({
    where: { tx_ref: txRef },
    include: PAYMENT_INCLUDE,
  });
  if (!payment) throw new AppError("Payment not found", 404);

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && payment.rental.user_id !== user.id) {
    throw new AppError("Forbidden", 403);
  }

  if (payment.status === "SUCCESS") {
    return { payment, source: "local" };
  }

  const secret = process.env.CHAPA_SECRET_KEY;
  if (!secret) {
    return { payment, source: "local" };
  }

  const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });
  const result = await response.json();
  const chapaStatus = String(result?.data?.status || result?.status || "").toLowerCase();
  const isSuccess = chapaStatus === "success";
  const isFailed = chapaStatus === "failed";

  if (!response.ok || (!isSuccess && !isFailed)) {
    return { payment, source: "local" };
  }

  if (isSuccess && payment.status !== "SUCCESS") {
    const chapaAmount = Number(result?.data?.amount ?? NaN);
    const expectedAmount = roundMoney(payment.amount);
    if (Number.isFinite(chapaAmount) && roundMoney(chapaAmount) !== expectedAmount) {
      const mismatch = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", paid_at: new Date() },
        include: PAYMENT_INCLUDE,
      });
      return { payment: mismatch, source: "chapa" };
    }

    const isFinePayment = (payment.context || "FINE") === "FINE";
    const updated = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", paid_at: new Date() },
        include: PAYMENT_INCLUDE,
      });
      await settlePaymentSuccessEffects(tx, updatedPayment);
      return updatedPayment;
    });

    await createNotification({
      userId: updated.rental.user_id,
      message: isFinePayment
        ? `✅ Payment of ${Number(updated.amount).toFixed(2)} ETB for "${updated.rental.physical_book.title}" was verified successfully.`
        : `✅ Borrow payment of ${Number(updated.amount).toFixed(2)} ETB for "${updated.rental.physical_book.title}" was verified successfully.`,
      type: "INFO",
      io,
    });

    return { payment: updated, source: "chapa" };
  }

  if (isFailed && payment.status !== "FAILED") {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", paid_at: new Date() },
      include: PAYMENT_INCLUDE,
    });
    return { payment: updated, source: "chapa" };
  }

  return { payment, source: "chapa" };
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
    if (["PENDING", "SUCCESS", "FAILED"].includes(s)) where.status = s;
  }

  const [payments, total, totals] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paid_at: "desc" },
      skip,
      take: limit,
      include: {
        rental: {
          select: {
            id: true,
            loan_date: true,
            due_date: true,
            return_date: true,
            status: true,
            fine: true,
            physical_book: { select: { id: true, title: true, cover_image_url: true } },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { rental: { user_id: userId }, status: "SUCCESS" },
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
    if (["PENDING", "SUCCESS", "FAILED"].includes(s)) where.status = s;
  }
  if (query.method) {
    const m = query.method.toUpperCase();
    if (["CHAPA", "CASH"].includes(m)) where.method = m;
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
        OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
      },
    };
  }

  const [payments, total, revenueStats] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paid_at: "desc" },
      skip,
      take: limit,
      include: PAYMENT_INCLUDE,
    }),
    prisma.payment.count({ where }),
    // Revenue breakdown for the current filter
    prisma.payment.aggregate({
      where: { ...where, status: "SUCCESS" },
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
