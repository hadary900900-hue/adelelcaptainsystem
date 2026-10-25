import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class WarehousesService {
  async list(orgId: string, { skip, limit, search }: any, branchId?: string) {
    const where: any = { branch: { organizationId: orgId } };
    if (branchId) {
      where.branchId = branchId;
    }
    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, warehouses] = await Promise.all([
      prisma.warehouse.count({ where }),
      prisma.warehouse.findMany({
        where,
        skip,
        take: limit,
        include: { branch: true },
        orderBy: { code: 'asc' }
      })
    ]);

    return { total, data: warehouses };
  }

  async getById(id: string) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: { branch: true }
    });
    if (!warehouse) throw new AppError('Warehouse not found', 404);
    return warehouse;
  }

  async create(data: any, createdBy: string) {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new AppError('Branch not found', 404);

    const exists = await prisma.warehouse.findFirst({ where: { code: data.code, branchId: data.branchId } });
    if (exists) throw new AppError('Warehouse code already exists in this branch', 400);

    const warehouse = await prisma.warehouse.create({ data });

    createAuditLog({
      userId: createdBy,
      branchId: warehouse.branchId,
      entityType: 'Warehouse',
      entityId: warehouse.id,
      action: 'create',
      afterData: { code: warehouse.code, nameEn: warehouse.nameEn }
    });

    return warehouse;
  }

  async update(id: string, data: any, updatedBy: string) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new AppError('Warehouse not found', 404);

    if (data.code && data.code !== warehouse.code) {
      const exists = await prisma.warehouse.findFirst({ where: { code: data.code, branchId: data.branchId || warehouse.branchId } });
      if (exists) throw new AppError('Warehouse code already exists in this branch', 400);
    }

    const updatedWarehouse = await prisma.warehouse.update({
      where: { id },
      data
    });

    createAuditLog({
      userId: updatedBy,
      branchId: updatedWarehouse.branchId,
      entityType: 'Warehouse',
      entityId: id,
      action: 'update',
      beforeData: warehouse,
      afterData: updatedWarehouse
    });

    return updatedWarehouse;
  }

  async delete(id: string, deletedBy: string) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new AppError('Warehouse not found', 404);

    await prisma.warehouse.delete({ where: { id } });

    createAuditLog({
      userId: deletedBy,
      branchId: warehouse.branchId,
      entityType: 'Warehouse',
      entityId: id,
      action: 'delete'
    });
  }
}
