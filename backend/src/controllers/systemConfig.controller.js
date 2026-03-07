/**
 * System Config Controller
 */

import * as systemConfigService from '../services/systemConfig.service.js';
import { logAdminActivity } from '../services/adminActivity.service.js';

export const getConfig = async (req, res) => {
  const config = await systemConfigService.getConfig();
  res.json({ status: 'success', data: { config } });
};

export const updateConfig = async (req, res) => {
  const io = req.app.locals.io;
  const config = await systemConfigService.updateConfig(req.user.id, req.body, io);
  await logAdminActivity({
    adminUserId: req.user.id,
    action: 'UPDATE',
    entityType: 'SYSTEM_CONFIG',
    entityId: String(config.id),
    description: 'Updated system configuration',
    metadata: {
      max_loan_days: config.max_loan_days,
      daily_fine: Number(config.daily_fine),
      max_books_per_user: config.max_books_per_user,
      low_stock_threshold: config.low_stock_threshold,
      reservation_window_hr: config.reservation_window_hr,
    },
    req,
  });
  res.json({ status: 'success', data: { config } });
};
