const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, isActive: true, firstNameEn: true, lastNameEn: true },
    take: 10
  });
  console.log('Users in DB:');
  console.log(JSON.stringify(users, null, 2));
  
  const branches = await prisma.branch.findMany({
    select: { id: true, code: true, nameEn: true, nameAr: true, isActive: true, isHeadquarters: true }
  });
  console.log('\nBranches in DB:');
  console.log(JSON.stringify(branches, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
