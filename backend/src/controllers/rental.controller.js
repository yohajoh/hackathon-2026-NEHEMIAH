/**
 * Rental Controller
 */

import * as rentalService from "../services/rental.service.js";
import { logAdminActivity } from "../services/adminActivity.service.js";

const getIo = (req) => req.app.locals.io;

export const getAllRentals = async (req, res) => {
  const result = await rentalService.getAllRentals(req.query);
  res.json({ status: "success", ...result });
};

export const getMyRentals = async (req, res) => {
  const result = await rentalService.getMyRentals(req.user.id, req.query, {
    studentProfileId: req.authContext?.activePersona === "STUDENT" ? req.authContext.studentProfileId : null,
  });
  res.json({ status: "success", ...result });
};

export const getRental = async (req, res) => {
  const rental = await rentalService.getRentalById(req.params.id, req.user);
  res.json({ status: "success", data: { rental } });
};

export const borrowBook = async (req, res) => {
  const rental = await rentalService.borrowBook(req.user.id, req.body, getIo(req), {
    actorUserId: req.user.id,
    studentProfileId: req.authContext?.activePersona === "STUDENT" ? req.authContext.studentProfileId : null,
    allowDebtSettlement: req.body?.allow_debt_settlement,
  });

  res.status(201).json({ status: "success", data: { rental } });
};

export const returnBook = async (req, res) => {
  const result = await rentalService.returnBook(req.params.id, getIo(req));
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "RETURN",
    entityType: "RENTAL",
    entityId: req.params.id,
    description: `Processed return for rental ${req.params.id}`,
    metadata: { status: result.newStatus, fine: result.fine ?? 0 },
    req,
  });
  res.json({ status: "success", data: result });
};

export const getOverdueRentals = async (req, res) => {
  const result = await rentalService.getOverdueRentals(req.query);
  res.json({ status: "success", ...result });
};

export const getOverdueRanking = async (req, res) => {
  const result = await rentalService.getOverdueRanking(req.query);
  res.json({ status: "success", ...result });
};

export const sendOverdueReminders = async (req, res) => {
  const result = await rentalService.sendOverdueReminders(getIo(req));
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "REMIND",
    entityType: "RENTAL",
    description: `Sent ${result.remindersSent} overdue reminder notification(s).`,
    metadata: result,
    req,
  });
  res.json({ status: "success", data: result });
};

export const extendRental = async (req, res) => {
  const result = await rentalService.extendRental(req.params.id, req.body, getIo(req));
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "EXTEND",
    entityType: "RENTAL",
    entityId: req.params.id,
    description: `Extended rental ${req.params.id} by ${req.body?.extra_days || 0} day(s).`,
    metadata: { due_date: result.due_date },
    req,
  });
  res.json({ status: "success", data: { rental: result } });
};
