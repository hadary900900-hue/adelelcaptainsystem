import { prisma, Prisma } from '@erp/database';
import { logger } from './logger';

export interface AuditLogParams {
  userId?: string;
  branchId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export function createAuditLog(params: AuditLogParams) {
  prisma.auditLog.create({
    data: {
      userId: params.userId,
      branchId: params.branchId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeData: params.beforeData ? (typeof params.beforeData === 'string' ? params.beforeData : JSON.stringify(params.beforeData)) : null,
      afterData: params.afterData ? (typeof params.afterData === 'string' ? params.afterData : JSON.stringify(params.afterData)) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata ? (typeof params.metadata === 'string' ? params.metadata : JSON.stringify(params.metadata)) : null,
    }
  }).catch(err => {
    logger.error(`Failed to create audit log: ${err.message}`);
  });
}
