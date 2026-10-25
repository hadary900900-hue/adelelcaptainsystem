import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class BranchesService {
  async list(orgId: string, { skip, limit, search }: any) {
    const where: any = { organizationId: orgId };
    if (search) {
      where.OR = [
        { nameEn: { contains: search } },
        { nameAr: { contains: search } },
        { code: { contains: search } }
      ];
    }

    const [total, branches] = await Promise.all([
      prisma.branch.count({ where }),
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' }
      })
    ]);

    return { total, data: branches };
  }

  async getById(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { warehouses: true, userBranches: true }
        }
      }
    });
    if (!branch) throw new AppError('Branch not found', 404);
    return branch;
  }

  async create(orgId: string, data: any, createdBy: string) {
    const exists = await prisma.branch.findFirst({ where: { code: data.code, organizationId: orgId } });
    if (exists) throw new AppError('Branch code already exists', 400);

    const branch = await prisma.branch.create({
      data: {
        ...data,
        organizationId: orgId
      }
    });

    createAuditLog({
      userId: createdBy,
      branchId: branch.id,
      entityType: 'Branch',
      entityId: branch.id,
      action: 'create',
      afterData: { code: branch.code, nameEn: branch.nameEn }
    });

    return branch;
  }

  async update(id: string, data: any, updatedBy: string) {
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new AppError('Branch not found', 404);

    if (data.code && data.code !== branch.code) {
      const exists = await prisma.branch.findFirst({ where: { code: data.code, organizationId: branch.organizationId } });
      if (exists) throw new AppError('Branch code already exists', 400);
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data
    });

    createAuditLog({
      userId: updatedBy,
      branchId: id,
      entityType: 'Branch',
      entityId: id,
      action: 'update',
      beforeData: branch,
      afterData: updatedBranch
    });

    return updatedBranch;
  }

  async delete(id: string, deletedBy: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: { select: { warehouses: true, userBranches: true } }
      }
    });
    if (!branch) throw new AppError('Branch not found', 404);

    if (branch._count.warehouses > 0 || branch._count.userBranches > 0) {
      throw new AppError('Cannot delete branch with assigned warehouses or users', 400);
    }

    await prisma.branch.delete({ where: { id } });

    createAuditLog({
      userId: deletedBy,
      branchId: id,
      entityType: 'Branch',
      entityId: id,
      action: 'delete'
    });
  }
}
