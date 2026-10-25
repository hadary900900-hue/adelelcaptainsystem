import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanData() {
  console.log('--- Starting Data Cleanup ---');

  try {
    // 1. Inventory & Movements
    console.log('Cleaning inventory items & movements...');
    await prisma.stockTransferItem.deleteMany({});
    await prisma.stockTransfer.deleteMany({});
    await prisma.stockAdjustmentItem.deleteMany({});
    await prisma.stockAdjustment.deleteMany({});
    await prisma.stockCountItem.deleteMany({});
    await prisma.stockCount.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.stockBalance.deleteMany({});

    // 2. Vehicles & Products
    console.log('Cleaning vehicle units...');
    await prisma.vehicleUnit.deleteMany({});

    console.log('Cleaning products, images, barcodes & specs...');
    await prisma.sparePartInfo.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.productBarcode.deleteMany({});
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`Deleted ${deletedProducts.count} products.`);

    // 3. Models, Brands & Categories
    console.log('Cleaning vehicle models...');
    await prisma.vehicleModel.deleteMany({});

    console.log('Cleaning brands...');
    const deletedBrands = await prisma.brand.deleteMany({});
    console.log(`Deleted ${deletedBrands.count} brands.`);

    console.log('Cleaning categories...');
    const deletedCategories = await prisma.productCategory.deleteMany({});
    console.log(`Deleted ${deletedCategories.count} categories.`);

    // 4. Warehouses & Non-HQ Branches
    console.log('Cleaning warehouse locations & warehouses...');
    await prisma.warehouseLocation.deleteMany({});
    await prisma.warehouse.deleteMany({});

    console.log('Cleaning user branches associations (for non-HQ)...');
    const hq = await prisma.branch.findFirst({ where: { isHeadquarters: true } });
    
    if (hq) {
      await prisma.userBranch.deleteMany({
        where: { branchId: { not: hq.id } }
      });
      const deletedBranches = await prisma.branch.deleteMany({
        where: { id: { not: hq.id } }
      });
      console.log(`Deleted ${deletedBranches.count} secondary branches (Kept HQ Branch: ${hq.nameEn}).`);
    } else {
      await prisma.userBranch.deleteMany({});
      const deletedBranches = await prisma.branch.deleteMany({});
      console.log(`Deleted ${deletedBranches.count} branches.`);
    }

    console.log('--- Cleanup Finished Successfully! ---');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanData();
