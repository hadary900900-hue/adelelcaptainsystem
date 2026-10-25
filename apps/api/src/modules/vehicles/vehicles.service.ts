import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class VehiclesService {
  async list(orgId: string, { skip, limit, search, status, branchId, warehouseId, productId }: any) {
    const where: any = {
      product: { organizationId: orgId },
    };
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (search) {
      where.OR = [
        { vin: { contains: search } },
        { engineNumber: { contains: search } },
        { color: { contains: search } },
        { product: { nameEn: { contains: search } } },
        { product: { nameAr: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.vehicleUnit.count({ where }),
      prisma.vehicleUnit.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { include: { brand: true } },
          model: true,
          branch: true,
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async getById(id: string) {
    const unit = await prisma.vehicleUnit.findUnique({
      where: { id },
      include: {
        product: { include: { brand: true, category: true } },
        model: true,
        branch: true,
        warehouse: true,
        stockMovements: {
          include: { createdBy: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!unit) throw new AppError('Vehicle unit not found', 404);
    return unit;
  }

  async getByVin(vin: string) {
    const unit = await prisma.vehicleUnit.findUnique({
      where: { vin },
      include: {
        product: { include: { brand: true } },
        model: true,
        branch: true,
        warehouse: true,
      },
    });
    if (!unit) throw new AppError('Vehicle unit not found with VIN: ' + vin, 404);
    return unit;
  }

  async create(data: any, userId: string) {
    const vinExists = await prisma.vehicleUnit.findUnique({ where: { vin: data.vin } });
    if (vinExists) throw new AppError('Vehicle with this VIN already exists', 400);

    const engExists = await prisma.vehicleUnit.findUnique({ where: { engineNumber: data.engineNumber } });
    if (engExists) throw new AppError('Vehicle with this Engine Number already exists', 400);

    const unit = await prisma.$transaction(async (tx) => {
      const createdUnit = await tx.vehicleUnit.create({
        data,
        include: { product: true },
      });

      // Update warehouse stock balance for vehicle product
      const balance = await tx.stockBalance.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: data.warehouseId,
            productId: data.productId,
          },
        },
        update: {
          quantity: { increment: 1 },
          availableQty: { increment: 1 },
        },
        create: {
          warehouseId: data.warehouseId,
          productId: data.productId,
          quantity: 1,
          availableQty: 1,
          avgCost: data.purchaseCost || 0,
        },
      });

      // Create Stock Movement record for initial intake
      await tx.stockMovement.create({
        data: {
          movementNumber: `MOV-VEH-${Date.now()}`,
          movementType: 'PURCHASE_IN',
          productId: data.productId,
          warehouseId: data.warehouseId,
          branchId: data.branchId,
          vehicleUnitId: createdUnit.id,
          quantity: 1,
          unitCost: data.purchaseCost || 0,
          totalCost: data.purchaseCost || 0,
          beforeQuantity: balance.quantity - 1,
          afterQuantity: balance.quantity,
          referenceType: 'PURCHASE_ORDER',
          referenceNumber: `VIN:${createdUnit.vin}`,
          notes: `Vehicle Intake: ${createdUnit.vin} (Engine: ${createdUnit.engineNumber})`,
          createdById: userId,
        },
      });

      return createdUnit;
    });

    createAuditLog({
      userId,
      branchId: unit.branchId,
      entityType: 'VehicleUnit',
      entityId: unit.id,
      action: 'create',
      afterData: unit,
    });

    return unit;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await prisma.vehicleUnit.findUnique({ where: { id } });
    if (!existing) throw new AppError('Vehicle unit not found', 404);

    const updated = await prisma.vehicleUnit.update({
      where: { id },
      data,
    });

    createAuditLog({
      userId,
      branchId: updated.branchId,
      entityType: 'VehicleUnit',
      entityId: id,
      action: 'update',
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.vehicleUnit.findUnique({ where: { id } });
    if (!existing) throw new AppError('Vehicle unit not found', 404);
    if (existing.status === 'SOLD') {
      throw new AppError('Cannot delete a sold vehicle unit', 400);
    }

    await prisma.$transaction(async (tx) => {
      // Decrement stock balance
      const balance = await tx.stockBalance.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: existing.warehouseId,
            productId: existing.productId,
          },
        },
      });
      if (balance && balance.quantity > 0) {
        await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            quantity: balance.quantity - 1,
            availableQty: Math.max(0, balance.availableQty - 1),
          },
        });
      }

      await tx.vehicleUnit.delete({ where: { id } });
    });

    createAuditLog({
      userId,
      branchId: existing.branchId,
      entityType: 'VehicleUnit',
      entityId: id,
      action: 'delete',
    });
  }
}
