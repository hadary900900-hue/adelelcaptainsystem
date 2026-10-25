import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteBranches() {
  console.log('--- جاري البحث عن الفروع المطلوب حذفها ---');
  try {
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);

    // List all branches
    const allBranches = await prisma.branch.findMany({
      include: { warehouses: true }
    });
    console.log('الفروع الحالية في النظام:');
    allBranches.forEach(b => console.log(`- ID: ${b.id} | Code: ${b.code} | NameAr: ${b.nameAr} | NameEn: ${b.nameEn}`));

    // Find branches to delete
    const branchesToDelete = allBranches.filter(b => {
      const name = `${b.nameAr} ${b.nameEn} ${b.code}`.toLowerCase();
      return name.includes('معادي') || name.includes('maadi') || name.includes('نصر') || name.includes('nasr');
    });

    if (branchesToDelete.length === 0) {
      console.log('لم يتم العثور على فروع باسم المعادي أو مدينة نصر');
      return;
    }

    for (const br of branchesToDelete) {
      console.log(`جاري حذف الفرع: ${br.nameAr || br.nameEn} (ID: ${br.id})...`);

      // Delete userBranch links
      await prisma.userBranch.deleteMany({
        where: { branchId: br.id }
      });

      // Delete warehouse locations and warehouses
      for (const wh of br.warehouses) {
        await prisma.warehouseLocation.deleteMany({
          where: { warehouseId: wh.id }
        });
      }
      await prisma.warehouse.deleteMany({
        where: { branchId: br.id }
      });

      // Delete the branch
      await prisma.branch.delete({
        where: { id: br.id }
      });

      console.log(`تم حذف الفرع: ${br.nameAr || br.nameEn} بنجاح`);
    }

    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);
    console.log('✅ اكتملت العملية بنجاح!');
  } catch (err) {
    console.error('حدث خطأ أثناء حذف الفروع:', err);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBranches();
