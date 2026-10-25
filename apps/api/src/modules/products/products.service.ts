import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class ProductsService {
  async list(orgId: string, { skip, limit, search, type, categoryId, brandId }: any) {
    const where: any = { organizationId: orgId };
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { nameEn: { contains: search } },
        { nameAr: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          brand: true,
          vehicleModel: true,
          sparePartInfo: true,
          stockBalances: {
            include: { warehouse: true },
          },
          _count: { select: { vehicleUnits: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        vehicleModel: true,
        sparePartInfo: true,
        images: true,
        barcodes: true,
        vehicleUnits: {
          include: { branch: true, warehouse: true },
          orderBy: { createdAt: 'desc' },
        },
        stockBalances: {
          include: { warehouse: true, location: true },
        },
        stockMovements: {
          include: { warehouse: true, createdBy: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async getByBarcode(barcode: string, orgId: string) {
    const product = await prisma.product.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { barcode },
          { barcodes: { some: { barcode } } },
        ],
      },
      include: {
        category: true,
        brand: true,
        vehicleModel: true,
        sparePartInfo: true,
        stockBalances: { include: { warehouse: true } },
      },
    });
    if (!product) throw new AppError('No product found with barcode: ' + barcode, 404);
    return product;
  }

  async create(data: any, orgId: string, userId: string) {
    const existing = await prisma.product.findFirst({
      where: { organizationId: orgId, sku: data.sku },
    });
    if (existing) throw new AppError('Product with this SKU already exists', 400);

    const { oemNumber, compatibleModels, supplierName, warrantyMonths, defaultShelf, ...prodData } = data;

    const product = await prisma.product.create({
      data: {
        ...prodData,
        organizationId: orgId,
        ...(data.type === 'SPARE_PART' || oemNumber || compatibleModels ? {
          sparePartInfo: {
            create: {
              oemNumber,
              compatibleModels,
              supplierName,
              warrantyMonths: warrantyMonths || 0,
              defaultShelf,
            },
          },
        } : {}),
      },
      include: { sparePartInfo: true },
    });

    createAuditLog({
      userId,
      entityType: 'Product',
      entityId: product.id,
      action: 'create',
      afterData: product,
    });

    return product;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { sparePartInfo: true },
    });
    if (!existing) throw new AppError('Product not found', 404);

    const { oemNumber, compatibleModels, supplierName, warrantyMonths, defaultShelf, ...prodData } = data;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...prodData,
        ...(existing.type === 'SPARE_PART' || oemNumber !== undefined ? {
          sparePartInfo: {
            upsert: {
              create: {
                oemNumber,
                compatibleModels,
                supplierName,
                warrantyMonths: warrantyMonths || 0,
                defaultShelf,
              },
              update: {
                oemNumber,
                compatibleModels,
                supplierName,
                warrantyMonths: warrantyMonths !== undefined ? warrantyMonths : undefined,
                defaultShelf,
              },
            },
          },
        } : {}),
      },
      include: { sparePartInfo: true },
    });

    createAuditLog({
      userId,
      entityType: 'Product',
      entityId: id,
      action: 'update',
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: { select: { stockMovements: true, vehicleUnits: true } },
      },
    });
    if (!existing) throw new AppError('Product not found', 404);
    if (existing._count.stockMovements > 0 || existing._count.vehicleUnits > 0) {
      throw new AppError('Cannot delete product with existing stock movements or vehicle units', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.sparePartInfo.deleteMany({ where: { productId: id } });
      await tx.productBarcode.deleteMany({ where: { productId: id } });
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.stockBalance.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    createAuditLog({
      userId,
      entityType: 'Product',
      entityId: id,
      action: 'delete',
    });
  }
}
