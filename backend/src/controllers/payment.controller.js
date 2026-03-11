/**
 * Payment Controller
 */

import * as paymentService from "../services/payment.service.js";

const getIo = (req) => req.app.locals.io;

export const initiatePayment = async (req, res) => {
  const result = await paymentService.initiatePayment(req.params.rentalId, req.user.id, req.body, getIo(req));
  res.status(201).json({ status: "success", data: result });
};

export const verifyPayment = async (req, res) => {
  const result = await paymentService.verifyPaymentByTxRef(req.params.txRef, req.user, getIo(req));
  res.json({ status: "success", data: result });
};

export const handleWebhook = async (req, res) => {
  const signature = req.headers["chapa-signature"] || req.headers["x-chapa-signature"] || "";
  const isBufferPayload = Buffer.isBuffer(req.body);
  const rawPayload = isBufferPayload ? req.body.toString("utf8") : JSON.stringify(req.body || {});
  let parsedPayload = req.body || {};
  if (isBufferPayload) {
    try {
      parsedPayload = JSON.parse(rawPayload || "{}");
    } catch {
      parsedPayload = {};
    }
  }
  const result = await paymentService.handleWebhook(rawPayload, parsedPayload, signature, getIo(req));
  res.json({ status: "success", data: result });
};

export const recordCashPayment = async (req, res) => {
  const result = await paymentService.recordCashPayment(req.params.paymentId, req.user.id, getIo(req));
  res.json({ status: "success", data: result });
};

export const getMyPayments = async (req, res) => {
  const result = await paymentService.getMyPayments(req.user.id, req.query);
  res.json({ status: "success", ...result });
};

export const getMyDebtSummary = async (req, res) => {
  const result = await paymentService.getMyDebtSummary(req.user.id);
  res.json({ status: "success", data: result });
};

export const getAllPayments = async (req, res) => {
  const result = await paymentService.getAllPayments(req.query);
  res.json({ status: "success", ...result });
};
