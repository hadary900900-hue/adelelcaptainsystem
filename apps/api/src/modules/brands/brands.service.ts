import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class BrandsService {
  async list(orgId: string, { skip, limit, search }: any) {
    const where: any = { organizationId: orgId };
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { nameEn: { contains: search } },
        { nameAr: { contains: search } },
      ];
    }
    const [total, data] = await Promise.all([
      prisma.brand.count({ where }),
      prisma.brand.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { vehicleModels: true, products: true } } },
        orderBy: { nameEn: 'asc' },
      }),
    ]);
    return { total, data };
  }

  async getById(id: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { vehicleModels: true, products: true },
    });
    if (!brand) throw new AppError('Brand not found', 404);
    return brand;
  }

  async create(data: any, orgId: string, userId: string) {
    const existing = await prisma.brand.findFirst({
      where: { organizationId: orgId, code: data.code },
    });
    if (existing) throw new AppError('Brand code already exists', 400);

    const brand = await prisma.brand.create({
      data: { ...data, organizationId: orgId },
    });

    createAuditLog({
      userId,
      entityType: 'Brand',
      entityId: brand.id,
      action: 'create',
      afterData: brand,
    });
    return brand;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) throw new AppError('Brand not found', 404);

    const updated = await prisma.brand.update({
      where: { id },
      data,
    });

    createAuditLog({
      userId,
      entityType: 'Brand',
      entityId: id,
      action: 'update',
      beforeData: existing,
      afterData: updated,
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new AppError('Brand not found', 404);
    if (existing._count.products > 0) {
      throw new AppError('Cannot delete brand with associated products. Please delete or reassign its products first.', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.vehicleModel.deleteMany({ where: { brandId: id } });
      await tx.brand.delete({ where: { id } });
    });

    createAuditLog({
      userId,
      entityType: 'Brand',
      entityId: id,
      action: 'delete',
    });
  }

  // Vehicle Models under Brand
  async listModels(brandId: string) {
    return prisma.vehicleModel.findMany({
      where: { brandId },
      orderBy: { code: 'asc' },
    });
  }

  async createModel(brandId: string, data: any, userId: string) {
    const existing = await prisma.vehicleModel.findFirst({
      where: { brandId, code: data.code },
    });
    if (existing) throw new AppError('Model code already exists for this brand', 400);

    const model = await prisma.vehicleModel.create({
      data: { ...data, brandId },
    });

    createAuditLog({
      userId,
      entityType: 'VehicleModel',
      entityId: model.id,
      action: 'create',
      afterData: model,
    });
    return model;
  }
}
