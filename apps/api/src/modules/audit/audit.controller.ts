import { Response, NextFunction } from 'express';
import { prisma } from '@erp/database';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';

export class AuditController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req.query);
      const { entityType, action, userId, dateFrom, dateTo } = req.query;

      const where: any = {};
      if (entityType) where.entityType = entityType;
      if (action) where.action = action;
      if (userId) where.userId = userId;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip: pagination.skip,
          take: pagination.limit,
          include: { user: { select: { firstNameEn: true, lastNameEn: true } } },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      sendPaginated(res, logs, {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      });
    } catch (error) {
      next(error);
    }
  }
}
