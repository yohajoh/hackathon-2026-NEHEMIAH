/**
 * Author Controller
 */

import * as authorService from '../services/author.service.js';
import { logAdminActivity } from '../services/adminActivity.service.js';

export const getAuthors = async (req, res) => {
  const result = await authorService.getAuthors(req.query);
  res.json({ status: 'success', ...result });
};

export const getAuthor = async (req, res) => {
  const author = await authorService.getAuthorById(req.params.id);
  res.json({ status: 'success', data: { author } });
};

export const createAuthor = async (req, res) => {
  const imageFile = req.file || null;
  const author = await authorService.createAuthor(req.body, imageFile);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'CREATE',
    entityType: 'AUTHOR',
    entityId: author.id,
    description: `Created author "${author.name}"`,
    req,
  });
  res.status(201).json({ status: 'success', data: { author } });
};

export const updateAuthor = async (req, res) => {
  const imageFile = req.file || null;
  const author = await authorService.updateAuthor(req.params.id, req.body, imageFile);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'UPDATE',
    entityType: 'AUTHOR',
    entityId: author.id,
    description: `Updated author "${author.name}"`,
    metadata: { payload: req.body },
    req,
  });
  res.json({ status: 'success', data: { author } });
};

export const deleteAuthor = async (req, res) => {
  await authorService.deleteAuthor(req.params.id);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'DELETE',
    entityType: 'AUTHOR',
    entityId: req.params.id,
    description: `Deleted author ${req.params.id}`,
    req,
  });
  res.json({ status: 'success', message: 'Author deleted successfully' });
};
