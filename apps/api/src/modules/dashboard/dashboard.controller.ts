import { Response, NextFunction } from 'express';
import { prisma } from '@erp/database';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';

export class DashboardController {
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;

      const [totalBranches, totalWarehouses, totalUsers, totalRoles, recentLogs] = await Promise.all([
        prisma.branch.count({ where: { organizationId: orgId } }),
        prisma.warehouse.count({ where: { branch: { organizationId: orgId } } }),
        prisma.user.count({ where: { organizationId: orgId } }),
        prisma.role.count({ where: { organizationId: orgId } }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstNameEn: true, lastNameEn: true } } }
        })
      ]);

      const systemStatus = {
        database: 'Connected',
        version: '1.0.0',
        uptime: process.uptime()
      };

      sendSuccess(res, {
        totalBranches,
        totalWarehouses,
        totalUsers,
        totalRoles,
        systemStatus,
        recentAuditLogs: recentLogs
      });
    } catch (error) {
      next(error);
    }
  }
}
