/**
 * Notification Controller
 */

import * as notificationService from '../services/notification.service.js';

const getIo = (req) => req.app.locals.io;

export const getMyNotifications = async (req, res) => {
  const result = await notificationService.getMyNotifications(req.user.id, req.query);
  res.json({ status: 'success', ...result });
};

export const getAllNotifications = async (req, res) => {
  const result = await notificationService.getAllNotifications(req.query);
  res.json({ status: 'success', ...result });
};

export const markAsRead = async (req, res) => {
  const result = await notificationService.markAsRead(req.params.id, req.user.id, req.user.role);
  res.json({ status: 'success', data: { notification: result } });
};

export const markMultipleAsRead = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ status: 'error', message: 'ids array is required' });
  }
  const result = await notificationService.markMultipleAsRead(ids, req.user.id);
  res.json({ status: 'success', data: result });
};

export const markAllAsRead = async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.json({ status: 'success', data: result });
};

export const viewNotification = async (req, res) => {
  const result = await notificationService.viewNotification(req.params.id, req.user.id);
  res.json({ status: 'success', data: { notification: result } });
};

export const broadcastNotification = async (req, res) => {
  const result = await notificationService.broadcastNotification({ ...req.body, io: getIo(req) });
  res.status(201).json({ status: 'success', data: result });
};

export const deleteNotification = async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user);
  res.json({ status: 'success', message: 'Notification deleted' });
};

export const deleteAllRead = async (req, res) => {
  const result = await notificationService.deleteAllRead(req.user.id);
  res.json({ status: 'success', data: result });
};
