import * as reservationService from "../services/reservation.service.js";
import { logAdminActivity } from "../services/adminActivity.service.js";

const getIo = (req) => req.app.locals.io;

export const getMyReservations = async (req, res) => {
  const result = await reservationService.getMyReservations(req.user.id, req.query, {
    studentProfileId: req.authContext?.activePersona === "STUDENT" ? req.authContext.studentProfileId : null,
  });
  res.json({ status: "success", ...result });
};

export const createReservation = async (req, res) => {
  const reservation = await reservationService.createReservation(req.user.id, req.body, getIo(req), {
    actorUserId: req.user.id,
    studentProfileId: req.authContext?.activePersona === "STUDENT" ? req.authContext.studentProfileId : null,
  });

  res.status(201).json({ status: "success", data: { reservation } });
};

export const cancelReservation = async (req, res) => {
  const reservation = await reservationService.cancelReservation(req.params.id, req.user.id, {
    studentProfileId: req.authContext?.activePersona === "STUDENT" ? req.authContext.studentProfileId : null,
  });
  res.json({ status: "success", data: { reservation } });
};

export const getAllReservations = async (req, res) => {
  const result = await reservationService.getAllReservations(req.query);
  res.json({ status: "success", ...result });
};

export const moveToTop = async (req, res) => {
  const reservation = await reservationService.moveReservationToTop(req.params.id);

  await logAdminActivity({
    adminUserId: req.user.id,
    action: "REORDER",
    entityType: "RESERVATION",
    entityId: req.params.id,
    description: `Moved reservation for "${reservation.user.name}" on "${reservation.book.title}" to top of queue.`,
    req,
  });

  res.json({ status: "success", data: { reservation } });
};

export const issueReservation = async (req, res) => {
  const result = await reservationService.fulfillReservationAsRental(req.params.id, req.user.id, req.body, getIo(req));

  await logAdminActivity({
    adminUserId: req.user.id,
    action: "FULFILL",
    entityType: "RESERVATION",
    entityId: req.params.id,
    description: `Issued "${result.reservation.book.title}" to "${result.reservation.user.name}" (Reservation converted to Rental).`,
    metadata: { rental_id: result.rental.id, copy_id: result.rental.copy?.id || null },
    req,
  });

  res.json({ status: "success", data: result });
};

export const getHighDemand = async (req, res) => {
  const result = await reservationService.getHighDemandReservations(req.query);
  res.json({ status: "success", data: result });
};

export const expireReservations = async (req, res) => {
  const notifyUsers = req.body?.notifyUsers === true;
  const reservationIds = req.body?.reservationIds;
  const result = await reservationService.expirePendingReservations(getIo(req), {
    notifyUsers,
    reservationIds,
  });

  await logAdminActivity({
    adminUserId: req.user.id,
    action: "EXPIRE",
    entityType: "RESERVATION",
    entityId: null,
    description: reservationIds 
      ? `Admin cancelled ${result.expiredCount} specific reservation(s): ${result.expiredReservations.map(r => `"${r.bookTitle}" for ${r.studentName}`).join(', ')}.`
      : `Admin ran expiry sweep: cancelled ${result.expiredCount} expired reservation(s).`,
    metadata: result,
    req,
  });

  res.json({ status: "success", data: result });
};
