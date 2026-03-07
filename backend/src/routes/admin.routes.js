import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('ADMIN'));

router.get('/activity-logs', adminController.getActivityLogs);
router.get('/inventory-alerts', adminController.getInventoryAlerts);
router.patch('/inventory-alerts/:id/resolve', adminController.resolveInventoryAlert);
router.post('/inventory-alerts/scan', adminController.scanInventoryAlerts);
router.get('/reports/export', adminController.exportReport);
router.get('/users/:id/insights', adminController.getUserInsights);

export default router;
