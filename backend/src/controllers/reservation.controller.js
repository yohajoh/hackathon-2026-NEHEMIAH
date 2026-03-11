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

export const expireReservations = async (req, res) => {
  const result = await reservationService.expirePendingReservations(getIo(req));

  await logAdminActivity({
    adminUserId: req.user.id,
    action: "EXPIRE",
    entityType: "RESERVATION",
    entityId: null,
    description: `Admin expired ${result.expiredCount} reservation(s).`,
    metadata: result,
    req,
  });

  res.json({ status: "success", data: result });
};
