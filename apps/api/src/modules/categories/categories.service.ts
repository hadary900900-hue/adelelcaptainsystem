import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class CategoriesService {
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
      prisma.productCategory.count({ where }),
      prisma.productCategory.findMany({
        where,
        skip,
        take: limit,
        include: { parent: true, _count: { select: { products: true } } },
        orderBy: { code: 'asc' },
      }),
    ]);
    return { total, data };
  }

  async getById(id: string) {
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: { parent: true, children: true, products: true },
    });
    if (!category) throw new AppError('Category not found', 404);
    return category;
  }

  async create(data: any, orgId: string, userId: string) {
    const existing = await prisma.productCategory.findFirst({
      where: { organizationId: orgId, code: data.code },
    });
    if (existing) throw new AppError('Category code already exists', 400);

    const category = await prisma.productCategory.create({
      data: { ...data, organizationId: orgId },
    });

    createAuditLog({
      userId,
      entityType: 'ProductCategory',
      entityId: category.id,
      action: 'create',
      afterData: category,
    });
    return category;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) throw new AppError('Category not found', 404);

    const updated = await prisma.productCategory.update({
      where: { id },
      data,
    });

    createAuditLog({
      userId,
      entityType: 'ProductCategory',
      entityId: id,
      action: 'update',
      beforeData: existing,
      afterData: updated,
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.productCategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!existing) throw new AppError('Category not found', 404);
    if (existing._count.products > 0) throw new AppError('Cannot delete category with associated products', 400);
    if (existing._count.children > 0) throw new AppError('Cannot delete category with sub-categories', 400);

    await prisma.productCategory.delete({ where: { id } });

    createAuditLog({
      userId,
      entityType: 'ProductCategory',
      entityId: id,
      action: 'delete',
    });
  }
}
