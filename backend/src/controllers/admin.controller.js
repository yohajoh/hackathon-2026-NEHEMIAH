import * as adminActivityService from '../services/adminActivity.service.js';
import * as inventoryAlertService from '../services/inventoryAlert.service.js';
import * as reportService from '../services/report.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import { prisma } from '../prisma.js';

export const getActivityLogs = async (req, res) => {
  const result = await adminActivityService.getAdminActivityLogs(req.query);
  res.json({ status: 'success', ...result });
};

export const getInventoryAlerts = async (req, res) => {
  const result = await inventoryAlertService.getInventoryAlerts(req.query);
  res.json({ status: 'success', ...result });
};

export const resolveInventoryAlert = async (req, res) => {
  const alert = await inventoryAlertService.resolveInventoryAlert(req.params.id, req.user.id);
  await adminActivityService.logAdminActivity({
    adminUserId: req.user.id,
    action: 'RESOLVE',
    entityType: 'INVENTORY_ALERT',
    entityId: alert.id,
    description: `Resolved inventory alert (${alert.type}) for ${alert.physical_book?.title || 'System'}. Severity: ${alert.severity}`,
    metadata: { type: alert.type, severity: alert.severity },
    req,
  });
  res.json({ status: 'success', data: { alert } });
};

export const scanInventoryAlerts = async (req, res) => {
  const [extended, neverReturned] = await Promise.all([
    inventoryAlertService.scanExtendedOverdueAlerts(),
    inventoryAlertService.scanNeverReturnedAlerts(),
  ]);
  const result = {
    extendedOverdue: extended,
    neverReturned,
    created: (extended.created || 0) + (neverReturned.created || 0),
  };
  await adminActivityService.logAdminActivity({
    adminUserId: req.user.id,
    action: 'SCAN',
    entityType: 'INVENTORY_ALERT',
    description: `Triggered inventory alert scan. Created ${result.created} new extended overdue alert(s).`,
    metadata: result,
    req,
  });
  res.json({ status: 'success', data: result });
};

export const exportReport = async (req, res) => {
  const type = req.query.type;
  const format = (req.query.format || 'json').toLowerCase();

  const allowedTypes = ['rentals', 'users', 'inventory', 'overdue', 'reservations'];
  if (!allowedTypes.includes(type)) {
    throw new AppError('Invalid report type', 400);
  }

  if (!['json', 'csv', 'excel', 'pdf'].includes(format)) {
    throw new AppError('Invalid report format', 400);
  }

  const report = await reportService.buildReport(type, format);
  await adminActivityService.logAdminActivity({
    adminUserId: req.user.id,
    action: 'EXPORT',
    entityType: 'REPORT',
    entityId: type,
    description: `Exported ${type} report in ${format.toUpperCase()} format`,
    metadata: { type, format },
    req,
  });

  if (format !== 'json') {
    const extension = report.extension || (format === 'excel' ? 'xls' : format);
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.${extension}`);
    return res.status(200).send(report.body);
  }

  return res.status(200).json({ status: 'success', data: report.body });
};

export const getUserInsights = async (req, res) => {
  const userId = req.params.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      student_id: true,
      year: true,
      department: true,
      created_at: true,
      is_blocked: true,
      is_confirmed: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);

  const [rentals, wishlistCount, reviewCount] = await Promise.all([
    prisma.rental.findMany({
      where: { user_id: userId },
      include: {
        physical_book: {
          select: {
            id: true,
            title: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { loan_date: 'desc' },
      take: 50,
    }),
    prisma.wishlist.count({ where: { user_id: userId } }),
    prisma.review.count({ where: { user_id: userId } }),
  ]);

  const statusSummary = rentals.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const returned = rentals.filter((r) => r.status === 'RETURNED' || r.status === 'COMPLETED');
  const returnedOnTime = returned.filter(
    (r) => r.return_date && new Date(r.return_date).getTime() <= new Date(r.due_date).getTime(),
  ).length;
  const onTimeRate = returned.length > 0 ? Number(((returnedOnTime / returned.length) * 100).toFixed(1)) : 0;

  const activeOverdue = rentals.filter(
    (r) => r.status === 'BORROWED' && new Date(r.due_date).getTime() < Date.now(),
  ).length;

  const categoryFrequency = rentals.reduce((acc, r) => {
    const category = r.physical_book?.category?.name;
    if (!category) return acc;
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  const favoriteCategories = Object.entries(categoryFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const history = rentals.map((r) => {
    const effectiveReturn = r.return_date ? new Date(r.return_date) : new Date();
    const isLate = effectiveReturn.getTime() > new Date(r.due_date).getTime();
    const daysLate = isLate
      ? Math.ceil((effectiveReturn.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: r.id,
      status: r.status,
      bookTitle: r.physical_book?.title ?? 'Unknown',
      loanDate: r.loan_date,
      dueDate: r.due_date,
      returnDate: r.return_date,
      fine: Number(r.fine ?? 0),
      isLate,
      daysLate,
    };
  });

  return res.json({
    status: 'success',
    data: {
      user,
      stats: {
        totalRentals: rentals.length,
        activeOverdue,
        returnedOnTime,
        onTimeRate,
        wishlistCount,
        reviewCount,
        statusSummary,
      },
      favoriteCategories,
      history,
    },
  });
};
