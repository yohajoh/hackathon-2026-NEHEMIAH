/**
 * Category Controller
 */

import * as categoryService from '../services/category.service.js';
import { logAdminActivity } from '../services/adminActivity.service.js';

export const getCategories = async (req, res) => {
  const result = await categoryService.getCategories(req.query);
  res.json({ status: 'success', ...result });
};

export const getCategory = async (req, res) => {
  const result = await categoryService.getCategoryBySlugOrId(req.params.slugOrId, req.query);
  res.json({ status: 'success', data: result });
};

export const createCategory = async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'CREATE',
    entityType: 'CATEGORY',
    entityId: category.id,
    description: `Created category "${category.name}"`,
    req,
  });
  res.status(201).json({ status: 'success', data: { category } });
};

export const updateCategory = async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'UPDATE',
    entityType: 'CATEGORY',
    entityId: category.id,
    description: `Updated category "${category.name}"`,
    req,
  });
  res.json({ status: 'success', data: { category } });
};

export const deleteCategory = async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'DELETE',
    entityType: 'CATEGORY',
    entityId: req.params.id,
    description: `Deleted category ${req.params.id}`,
    req,
  });
  res.json({ status: 'success', message: 'Category deleted successfully' });
};
