import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('--- بدء تنظيف قاعدة البيانات الشامل ---');

  try {
    // Disable foreign key checks for clean wiping if SQLite
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);

    // 1. Workshop & Service Orders
    console.log('1. حذف بيانات الورشة وأوامر الشغل...');
    await prisma.odometerHistory.deleteMany({});
    await prisma.workOrderItem.deleteMany({});
    await prisma.workOrder.deleteMany({});

    // 2. Warranties & Commissions
    console.log('2. حذف شهادات الضمان والعمولات...');
    await prisma.warrantyRecord.deleteMany({});
    await prisma.salesCommission.deleteMany({});

    // 3. Sales & Invoices & Payments & Returns
    console.log('3. حذف المبيعات والفواتير والمدفوعات والمردودات...');
    await prisma.salesReturnItem.deleteMany({});
    await prisma.salesReturn.deleteMany({});
    await prisma.customerPayment.deleteMany({});
    await prisma.salesInvoiceItem.deleteMany({});
    await prisma.salesInvoice.deleteMany({});
    await prisma.salesOrderItem.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.salesQuotationItem.deleteMany({});
    await prisma.salesQuotation.deleteMany({});
    await prisma.vehicleReservation.deleteMany({});

    // 4. Customers & CRM
    console.log('4. حذف بيانات العملاء والـ CRM وملكيات المركبات...');
    await prisma.customerOwnership.deleteMany({});
    await prisma.customerNote.deleteMany({});
    await prisma.salesActivity.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.customer.deleteMany({});

    // 5. Inventory & Stock
    console.log('5. حذف حركات المخزون والتحويلات والتسويات والأرصدة...');
    await prisma.stockCountItem.deleteMany({});
    await prisma.stockCount.deleteMany({});
    await prisma.stockAdjustmentItem.deleteMany({});
    await prisma.stockAdjustment.deleteMany({});
    await prisma.stockTransferItem.deleteMany({});
    await prisma.stockTransfer.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.stockBalance.deleteMany({});

    // 6. Vehicles
    console.log('6. حذف وحدات المركبات...');
    await prisma.vehicleUnit.deleteMany({});

    // 7. Products, Barcodes, Images, SparePartInfo
    console.log('7. حذف تفاصيل المنتجات والباركود والصور...');
    await prisma.productBarcode.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.sparePartInfo.deleteMany({});
    await prisma.product.deleteMany({});

    // 8. Vehicle Models, Categories, Brands
    console.log('8. حذف الموديلات والتصنيفات والماركات...');
    await prisma.vehicleModel.deleteMany({});
    await prisma.productCategory.deleteMany({});
    await prisma.brand.deleteMany({});

    // 9. Audit Logs
    console.log('9. حذف سجلات التدقيق (Audit Logs)...');
    await prisma.auditLog.deleteMany({});

    // Re-enable foreign keys
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);

    console.log('=============================================');
    console.log('✅ تم تنظيف قاعدة البيانات بنجاح تام!');
    console.log(' تم الإبقاء على:');
    console.log('  - المنظمات (Organizations)');
    console.log('  - الفروع (Branches)');
    console.log('  - المستودعات (Warehouses)');
    console.log('  - المستخدمين (Users)');
    console.log('  - الصلاحيات والأدوار (Roles, Permissions, UserRoles)');
    console.log('=============================================');
  } catch (error) {
    console.error('حدث خطأ أثناء تنظيف قاعدة البيانات:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
