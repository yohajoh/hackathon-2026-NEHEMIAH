/**
 * Digital Book Controller
 */

import * as digitalBookService from "../services/digitalBook.service.js";
import { logAdminActivity } from "../services/adminActivity.service.js";
import { broadcastNotification } from "../services/notification.service.js";

export const getDigitalBooks = async (req, res) => {
  const result = await digitalBookService.getDigitalBooks(req.query, req.user || null);
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json({ status: "success", ...result });
};

export const getAdminDigitalBooks = async (req, res) => {
  const result = await digitalBookService.getAdminDigitalBooks(req.query);
  res.json({ status: "success", ...result });
};

export const getDigitalBook = async (req, res) => {
  const userId = req.user?.id || null;
  const book = await digitalBookService.getDigitalBookById(req.params.id, userId);
  res.set(
    "Cache-Control",
    userId ? "private, max-age=15, stale-while-revalidate=60" : "public, max-age=30, stale-while-revalidate=120",
  );
  res.json({ status: "success", data: { book } });
};

export const getDigitalBookPageData = async (req, res) => {
  const userId = req.user?.id || null;
  const data = await digitalBookService.getDigitalBookPageData(req.params.id, userId);
  res.set(
    "Cache-Control",
    userId ? "private, max-age=15, stale-while-revalidate=60" : "public, max-age=30, stale-while-revalidate=120",
  );
  res.json({ status: "success", data });
};

export const streamPdf = async (req, res) => {
  const { bytes, fileName, canDownload } = await digitalBookService.getPdfBytes(req.params.id, req.user);
  const wantsDownload = req.query.download === "true";
  const contentDisposition =
    wantsDownload && canDownload ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`;

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": contentDisposition,
    "Content-Length": bytes.length,
    "Cache-Control": "private, max-age=3600",
  });
  res.send(bytes);
};

export const markAsRead = async (req, res) => {
  await digitalBookService.markDigitalBookAsRead(req.params.id, req.user.id);
  res.status(204).send();
};

export const createDigitalBook = async (req, res) => {
  const files = /** @type {any} */ (req.files || {});
  const pdfFile = files.pdf?.[0] || null;
  const imageFile = files.image?.[0] || null;
  const galleryFiles = files.images || [];
  const book = await digitalBookService.createDigitalBook(req.body, pdfFile, imageFile, galleryFiles);
  await broadcastNotification({
    message: `New digital book added: "${book.title}" is now available in the digital library.`,
    type: "NEW_BOOK",
    io: req.app.locals.io,
  });
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "CREATE",
    entityType: "DIGITAL_BOOK",
    entityId: book.id,
    description: `Created digital book "${book.title}"`,
    metadata: { pdf_access: book.pdf_access },
    req,
  });
  res.status(201).json({ status: "success", data: { book } });
};

export const updateDigitalBook = async (req, res) => {
  const files = /** @type {any} */ (req.files || {});
  const pdfFile = files.pdf?.[0] || null;
  const imageFile = files.image?.[0] || null;
  const galleryFiles = files.images || [];
  const book = await digitalBookService.updateDigitalBook(req.params.id, req.body, pdfFile, imageFile, galleryFiles);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "UPDATE",
    entityType: "DIGITAL_BOOK",
    entityId: book.id,
    description: `Updated digital book "${book.title}"`,
    metadata: { payload: req.body },
    req,
  });
  res.json({ status: "success", data: { book } });
};

export const deleteDigitalBook = async (req, res) => {
  await digitalBookService.deleteDigitalBook(req.params.id);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: "DELETE",
    entityType: "DIGITAL_BOOK",
    entityId: req.params.id,
    description: `Soft-deleted digital book ${req.params.id}`,
    req,
  });
  res.json({ status: "success", message: "Digital book soft-deleted successfully" });
};
