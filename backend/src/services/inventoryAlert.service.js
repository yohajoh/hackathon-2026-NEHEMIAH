import { prisma } from '../prisma.js';
import { AppError } from '../middlewares/error.middleware.js';
import { paginationMeta } from '../utils/apiFeatures.js';

const getConfig = async () => {
  const config = await prisma.systemConfig.findFirst({ orderBy: { id: 'desc' } });
  return config;
};

export const syncLowStockAlertForBook = async (bookId) => {
  const [book, config] = await Promise.all([
    prisma.book.findFirst({
      where: { id: bookId, deleted_at: null },
      select: { id: true, title: true, available: true, copies: true },
    }),
    getConfig(),
  ]);

  if (!book || !config) return null;

  const threshold = config.low_stock_threshold ?? 2;
  const existing = await prisma.inventoryAlert.findFirst({
    where: {
      book_id: book.id,
      type: 'LOW_STOCK',
      is_resolved: false,
    },
    orderBy: { created_at: 'desc' },
  });

  if (book.available <= threshold) {
    const message = `Low stock: "${book.title}" has ${book.available}/${book.copies} copies available.`;
    if (existing) {
      return prisma.inventoryAlert.update({
        where: { id: existing.id },
        data: {
          current_available: book.available,
          threshold,
          message,
          severity: book.available === 0 ? 'HIGH' : 'MEDIUM',
        },
      });
    }

    return prisma.inventoryAlert.create({
      data: {
        book_id: book.id,
        type: 'LOW_STOCK',
        severity: book.available === 0 ? 'HIGH' : 'MEDIUM',
        threshold,
        current_available: book.available,
        message,
      },
    });
  }

  if (existing) {
    return prisma.inventoryAlert.update({
      where: { id: existing.id },
      data: {
        is_resolved: true,
        resolved_at: new Date(),
      },
    });
  }

  return null;
};

export const scanExtendedOverdueAlerts = async () => {
  const now = new Date();
  const rentals = await prisma.rental.findMany({
    where: /** @type {any} */ ({
      status: 'BORROWED',
      due_date: { lt: now },
    }),
    select: {
      id: true,
      book_id: true,
      due_date: true,
      physical_book: { select: { title: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  let created = 0;

  for (const rental of rentals) {
    const days = Math.ceil((now.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24));
    if (days < 14) continue;

    const existing = await prisma.inventoryAlert.findFirst({
      where: {
        book_id: rental.book_id,
        type: 'EXTENDED_OVERDUE',
        is_resolved: false,
        message: { contains: rental.id },
      },
    });

    if (!existing) {
      await prisma.inventoryAlert.create({
        data: {
          book_id: rental.book_id,
          type: 'EXTENDED_OVERDUE',
          severity: days >= 30 ? 'HIGH' : 'MEDIUM',
          message: `Extended overdue rental ${rental.id}: "${rental.physical_book.title}" is ${days} day(s) overdue by ${rental.user.name} (${rental.user.email}).`,
          current_available: null,
          threshold: 14,
        },
      });
      created += 1;
    }
  }

  return { created };
};

export const getInventoryAlerts = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.type) where.type = query.type;
  if (query.severity) where.severity = query.severity;
  if (query.is_resolved === 'true') where.is_resolved = true;
  if (query.is_resolved === 'false') where.is_resolved = false;

  const [alerts, total] = await Promise.all([
    prisma.inventoryAlert.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            available: true,
            copies: true,
            author: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
        resolved_by_user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ is_resolved: 'asc' }, { created_at: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.inventoryAlert.count({ where }),
  ]);

  return { alerts, meta: paginationMeta(total, page, limit) };
};

export const resolveInventoryAlert = async (id, adminUserId) => {
  const alert = await prisma.inventoryAlert.findUnique({ where: { id } });
  if (!alert) throw new AppError('Inventory alert not found', 404);
  if (alert.is_resolved) return alert;

  return prisma.inventoryAlert.update({
    where: { id },
    data: {
      is_resolved: true,
      resolved_at: new Date(),
      resolved_by_user_id: adminUserId,
    },
  });
};
