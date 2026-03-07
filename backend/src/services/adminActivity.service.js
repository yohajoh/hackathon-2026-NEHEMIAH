import { prisma } from '../prisma.js';
import { paginationMeta } from '../utils/apiFeatures.js';

const getRequestMeta = (req) => ({
  ip_address:
    req?.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req?.ip ||
    null,
  user_agent: req?.get?.('user-agent') || req?.headers?.['user-agent'] || null,
});

export const logAdminActivity = async ({
  adminUserId,
  action,
  entityType,
  entityId = null,
  description,
  metadata = null,
  req = null,
}) => {
  if (!adminUserId || !action || !entityType || !description) return null;

  const requestMeta = getRequestMeta(req);

  return prisma.adminActivityLog.create({
    data: {
      admin_user_id: adminUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata,
      ip_address: requestMeta.ip_address,
      user_agent: requestMeta.user_agent,
    },
  });
};

export const getAdminActivityLogs = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};

  if (query.admin_user_id) where.admin_user_id = query.admin_user_id;
  if (query.entity_type) where.entity_type = query.entity_type;
  if (query.action) where.action = query.action;

  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { description: { contains: q, mode: 'insensitive' } },
      { entity_type: { contains: q, mode: 'insensitive' } },
      { action: { contains: q, mode: 'insensitive' } },
      { admin: { name: { contains: q, mode: 'insensitive' } } },
      { admin: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.adminActivityLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.adminActivityLog.count({ where }),
  ]);

  return { logs, meta: paginationMeta(total, page, limit) };
};
