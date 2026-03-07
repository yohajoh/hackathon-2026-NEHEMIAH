/**
 * Book Controller – Physical Books
 */

import * as bookService from '../services/book.service.js';
import { logAdminActivity } from '../services/adminActivity.service.js';
import { broadcastNotification } from '../services/notification.service.js';

export const getBooks = async (req, res) => {
  const result = await bookService.getBooks(req.query);
  res.json({ status: 'success', ...result });
};

export const getAdminBooks = async (req, res) => {
  const result = await bookService.getAdminBooks(req.query);
  res.json({ status: 'success', ...result });
};

export const getBook = async (req, res) => {
  const userId = req.user?.id || null;
  const book = await bookService.getBookById(req.params.id, userId);
  res.json({ status: 'success', data: { book } });
};

export const getBookAvailability = async (req, res) => {
  const data = await bookService.getBookAvailability(req.params.id);
  res.json({ status: 'success', data });
};

export const createBook = async (req, res) => {
  const book = await bookService.createBook(req.body, req.file || null);
  await broadcastNotification({
    message: `New book added: "${book.title}" is now available in the library catalog.`,
    type: 'NEW_BOOK',
    io: req.app.locals.io,
  });
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'CREATE',
    entityType: 'BOOK',
    entityId: book.id,
    description: `Created physical book "${book.title}"`,
    metadata: { category_id: book.category_id, author_id: book.author_id, copies: book.copies },
    req,
  });
  res.status(201).json({ status: 'success', data: { book } });
};

export const updateBook = async (req, res) => {
  const book = await bookService.updateBook(req.params.id, req.body, req.file || null);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'UPDATE',
    entityType: 'BOOK',
    entityId: book.id,
    description: `Updated physical book "${book.title}"`,
    metadata: { payload: req.body },
    req,
  });
  res.json({ status: 'success', data: { book } });
};

export const deleteBook = async (req, res) => {
  await bookService.deleteBook(req.params.id);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'DELETE',
    entityType: 'BOOK',
    entityId: req.params.id,
    description: `Soft-deleted physical book ${req.params.id}`,
    req,
  });
  res.json({ status: 'success', message: 'Book soft-deleted successfully' });
};
