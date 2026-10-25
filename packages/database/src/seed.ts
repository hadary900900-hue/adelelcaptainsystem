import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const WarehouseType = {
  MAIN: 'MAIN',
  SECONDARY: 'SECONDARY',
  TRANSIT: 'TRANSIT',
  SERVICE: 'SERVICE',
  RETURNS: 'RETURNS',
};

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Organization
  const org = await prisma.organization.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      nameEn: 'Elsalam Bikes',
      nameAr: 'السلام بايكس',
      baseCurrency: 'EGP',
      vatRate: 14,
    },
  });
  console.log(`Organization created/updated: ${org.nameEn}`);

  // HQ Branch
  const hqBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'HQ' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'HQ',
      nameEn: 'Headquarters',
      nameAr: 'المقر الرئيسي',
      isHeadquarters: true,
    },
  });
  console.log(`Branch created/updated: ${hqBranch.nameEn}`);

  // Branch 2
  const br01 = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'BR01' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'BR01',
      nameEn: 'Maadi Branch',
      nameAr: 'فرع المعادي',
    },
  });
  console.log(`Branch created/updated: ${br01.nameEn}`);

  // HQ Warehouse
  const whHq = await prisma.warehouse.upsert({
    where: { branchId_code: { branchId: hqBranch.id, code: 'WH-HQ' } },
    update: {},
    create: {
      branchId: hqBranch.id,
      code: 'WH-HQ',
      nameEn: 'HQ Main Warehouse',
      nameAr: 'مخزن المقر الرئيسي',
      type: WarehouseType.MAIN,
    },
  });
  console.log(`Warehouse created/updated for HQ`);

  // BR01 Warehouse
  const whBr01 = await prisma.warehouse.upsert({
    where: { branchId_code: { branchId: br01.id, code: 'WH-BR01' } },
    update: {},
    create: {
      branchId: br01.id,
      code: 'WH-BR01',
      nameEn: 'Maadi Main Warehouse',
      nameAr: 'مخزن المعادي الرئيسي',
      type: WarehouseType.MAIN,
    },
  });
  console.log(`Warehouse created/updated for BR01`);

  // Permissions (Module by Module)
  const modules = [
    {
      module: 'auth',
      permissions: [
        { slug: 'auth.login', action: 'login', nameEn: 'Login', nameAr: 'تسجيل الدخول' },
        { slug: 'auth.logout', action: 'logout', nameEn: 'Logout', nameAr: 'تسجيل الخروج' },
        { slug: 'auth.change-password', action: 'change-password', nameEn: 'Change Password', nameAr: 'تغيير كلمة المرور' },
      ],
    },
    {
      module: 'users',
      permissions: [
        { slug: 'users.view', action: 'view', nameEn: 'View Users', nameAr: 'عرض المستخدمين' },
        { slug: 'users.create', action: 'create', nameEn: 'Create User', nameAr: 'إضافة مستخدم' },
        { slug: 'users.update', action: 'update', nameEn: 'Update User', nameAr: 'تعديل مستخدم' },
        { slug: 'users.delete', action: 'delete', nameEn: 'Delete User', nameAr: 'حذف مستخدم' },
      ],
    },
    {
      module: 'roles',
      permissions: [
        { slug: 'roles.view', action: 'view', nameEn: 'View Roles', nameAr: 'عرض الصلاحيات' },
        { slug: 'roles.create', action: 'create', nameEn: 'Create Role', nameAr: 'إضافة صلاحية' },
        { slug: 'roles.update', action: 'update', nameEn: 'Update Role', nameAr: 'تعديل صلاحية' },
        { slug: 'roles.delete', action: 'delete', nameEn: 'Delete Role', nameAr: 'حذف صلاحية' },
        { slug: 'roles.assign', action: 'assign', nameEn: 'Assign Role', nameAr: 'تعيين صلاحية' },
      ],
    },
    {
      module: 'branches',
      permissions: [
        { slug: 'branches.view', action: 'view', nameEn: 'View Branches', nameAr: 'عرض الفروع' },
        { slug: 'branches.create', action: 'create', nameEn: 'Create Branch', nameAr: 'إضافة فرع' },
        { slug: 'branches.update', action: 'update', nameEn: 'Update Branch', nameAr: 'تعديل فرع' },
        { slug: 'branches.delete', action: 'delete', nameEn: 'Delete Branch', nameAr: 'حذف فرع' },
      ],
    },
    {
      module: 'warehouses',
      permissions: [
        { slug: 'warehouses.view', action: 'view', nameEn: 'View Warehouses', nameAr: 'عرض المخازن' },
        { slug: 'warehouses.create', action: 'create', nameEn: 'Create Warehouse', nameAr: 'إضافة مخزن' },
        { slug: 'warehouses.update', action: 'update', nameEn: 'Update Warehouse', nameAr: 'تعديل مخزن' },
        { slug: 'warehouses.delete', action: 'delete', nameEn: 'Delete Warehouse', nameAr: 'حذف مخزن' },
      ],
    },
    {
      module: 'dashboard',
      permissions: [
        { slug: 'dashboard.view', action: 'view', nameEn: 'View Dashboard', nameAr: 'عرض لوحة التحكم' },
      ],
    },
    {
      module: 'audit',
      permissions: [
        { slug: 'audit.view', action: 'view', nameEn: 'View Audit Logs', nameAr: 'عرض سجلات النظام' },
      ],
    },
    {
      module: 'settings',
      permissions: [
        { slug: 'settings.view', action: 'view', nameEn: 'View Settings', nameAr: 'عرض الإعدادات' },
        { slug: 'settings.update', action: 'update', nameEn: 'Update Settings', nameAr: 'تحديث الإعدادات' },
      ],
    },
    // Phase 2 Modules
    {
      module: 'products',
      permissions: [
        { slug: 'products.view', action: 'view', nameEn: 'View Products', nameAr: 'عرض المنتجات' },
        { slug: 'products.create', action: 'create', nameEn: 'Create Product', nameAr: 'إضافة منتج' },
        { slug: 'products.update', action: 'update', nameEn: 'Update Product', nameAr: 'تعديل منتج' },
        { slug: 'products.delete', action: 'delete', nameEn: 'Delete Product', nameAr: 'حذف منتج' },
      ],
    },
    {
      module: 'categories',
      permissions: [
        { slug: 'categories.view', action: 'view', nameEn: 'View Categories', nameAr: 'عرض التصنيفات' },
        { slug: 'categories.create', action: 'create', nameEn: 'Create Category', nameAr: 'إضافة تصنيف' },
        { slug: 'categories.update', action: 'update', nameEn: 'Update Category', nameAr: 'تعديل تصنيف' },
        { slug: 'categories.delete', action: 'delete', nameEn: 'Delete Category', nameAr: 'حذف تصنيف' },
      ],
    },
    {
      module: 'brands',
      permissions: [
        { slug: 'brands.view', action: 'view', nameEn: 'View Brands', nameAr: 'عرض الماركات' },
        { slug: 'brands.create', action: 'create', nameEn: 'Create Brand', nameAr: 'إضافة ماركة' },
        { slug: 'brands.update', action: 'update', nameEn: 'Update Brand', nameAr: 'تعديل ماركة' },
        { slug: 'brands.delete', action: 'delete', nameEn: 'Delete Brand', nameAr: 'حذف ماركة' },
      ],
    },
    {
      module: 'vehicles',
      permissions: [
        { slug: 'vehicles.view', action: 'view', nameEn: 'View Vehicles', nameAr: 'عرض المركبات' },
        { slug: 'vehicles.create', action: 'create', nameEn: 'Create Vehicle', nameAr: 'إضافة مركبة' },
        { slug: 'vehicles.update', action: 'update', nameEn: 'Update Vehicle', nameAr: 'تعديل مركبة' },
        { slug: 'vehicles.delete', action: 'delete', nameEn: 'Delete Vehicle', nameAr: 'حذف مركبة' },
      ],
    },
    {
      module: 'inventory',
      permissions: [
        { slug: 'inventory.view', action: 'view', nameEn: 'View Inventory', nameAr: 'عرض المخزون' },
        { slug: 'inventory.transfer', action: 'transfer', nameEn: 'Transfer Stock', nameAr: 'تحويل مخزني' },
        { slug: 'inventory.adjust', action: 'adjust', nameEn: 'Adjust Stock', nameAr: 'تسوية مخزنية' },
        { slug: 'inventory.count', action: 'count', nameEn: 'Stock Count', nameAr: 'جرد المخزون' },
      ],
    },
    // Phase 3 Modules
    {
      module: 'customers',
      permissions: [
        { slug: 'customers.view', action: 'view', nameEn: 'View Customers', nameAr: 'عرض العملاء' },
        { slug: 'customers.create', action: 'create', nameEn: 'Create Customer', nameAr: 'إضافة عميل' },
        { slug: 'customers.update', action: 'update', nameEn: 'Update Customer', nameAr: 'تعديل عميل' },
        { slug: 'customers.delete', action: 'delete', nameEn: 'Delete Customer', nameAr: 'حذف عميل' },
      ],
    },
    {
      module: 'crm',
      permissions: [
        { slug: 'crm.view', action: 'view', nameEn: 'View CRM', nameAr: 'عرض إدارة علاقات العملاء' },
        { slug: 'crm.create', action: 'create', nameEn: 'Create CRM Lead/Activity', nameAr: 'إضافة فرصة بيعية أو نشاط' },
        { slug: 'crm.update', action: 'update', nameEn: 'Update CRM Lead/Activity', nameAr: 'تعديل فرصة بيعية أو نشاط' },
        { slug: 'crm.delete', action: 'delete', nameEn: 'Delete CRM Lead/Activity', nameAr: 'حذف فرصة بيعية أو نشاط' },
      ],
    },
    {
      module: 'sales',
      permissions: [
        { slug: 'sales.view', action: 'view', nameEn: 'View Sales', nameAr: 'عرض المبيعات' },
        { slug: 'sales.create', action: 'create', nameEn: 'Create Quotation/Order/Invoice', nameAr: 'إصدار فاتورة أو عرض سعر' },
        { slug: 'sales.update', action: 'update', nameEn: 'Update Sales', nameAr: 'تعديل المبيعات' },
        { slug: 'sales.delete', action: 'delete', nameEn: 'Delete Sales', nameAr: 'حذف المبيعات' },
        { slug: 'sales.pos', action: 'pos', nameEn: 'POS Terminal Access', nameAr: 'استخدام نقطة البيع' },
        { slug: 'sales.return', action: 'return', nameEn: 'Process Sales Return', nameAr: 'تسجيل مردودات مبيعات' },
        { slug: 'sales.approve', action: 'approve', nameEn: 'Approve Sales', nameAr: 'اعتماد المبيعات' },
        { slug: 'sales.payment', action: 'payment', nameEn: 'Receive Customer Payment', nameAr: 'استلام مدفوعات العملاء' },
      ],
    },
  ];

  const allPermissionIds: string[] = [];
  const viewPermissionIds: string[] = [];
  const adminPermissionIds: string[] = [];

  for (const mod of modules) {
    for (const p of mod.permissions) {
      const perm = await prisma.permission.upsert({
        where: { slug: p.slug },
        update: {
          nameEn: p.nameEn,
          nameAr: p.nameAr,
        },
        create: {
          slug: p.slug,
          module: mod.module,
          action: p.action,
          nameEn: p.nameEn,
          nameAr: p.nameAr,
        },
      });
      
      allPermissionIds.push(perm.id);
      
      if (p.action === 'view' || p.action === 'login' || p.action === 'logout' || p.action === 'change-password') {
        viewPermissionIds.push(perm.id);
      }
      
      if (mod.module !== 'settings' && mod.module !== 'audit' && mod.module !== 'roles') {
        adminPermissionIds.push(perm.id);
      }
    }
  }

  // Roles
  const superAdminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Super Admin' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Super Admin',
      nameAr: 'مدير النظام',
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Admin' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Admin',
      nameAr: 'مدير',
      isSystem: false,
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Viewer' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Viewer',
      nameAr: 'مستعرض',
      isSystem: false,
    },
  });

  console.log(`Roles created/updated`);

  // Assign permissions to roles
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: [superAdminRole.id, adminRole.id, viewerRole.id] } }
  });

  await prisma.rolePermission.createMany({
    data: allPermissionIds.map((id) => ({ roleId: superAdminRole.id, permissionId: id })),
  });

  await prisma.rolePermission.createMany({
    data: adminPermissionIds.map((id) => ({ roleId: adminRole.id, permissionId: id })),
  });

  await prisma.rolePermission.createMany({
    data: viewPermissionIds.map((id) => ({ roleId: viewerRole.id, permissionId: id })),
  });

  console.log(`Permissions assigned to roles`);

  // Admin User
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@erp.local' },
    update: { passwordHash },
    create: {
      organizationId: org.id,
      email: 'admin@erp.local',
      passwordHash,
      firstNameEn: 'System',
      lastNameEn: 'Admin',
      firstNameAr: 'مدير',
      lastNameAr: 'النظام',
      preferredLang: 'ar',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: hqBranch.id } },
    update: { isDefault: true },
    create: {
      userId: adminUser.id,
      branchId: hqBranch.id,
      isDefault: true,
    },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: br01.id } },
    update: {},
    create: {
      userId: adminUser.id,
      branchId: br01.id,
      isDefault: false,
    },
  });

  // ----------------------------------------------------
  // Phase 2 Sample Data: Categories, Brands, Models, Products
  // ----------------------------------------------------
  console.log('Seeding Phase 2 catalog & products...');

  // Categories
  const catVehicles = await prisma.productCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CAT-VEH' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'CAT-VEH',
      nameEn: 'Vehicles & Scooters',
      nameAr: 'الدراجات والسكوترات',
      description: 'Motorcycles, scooters, and light vehicles',
    },
  });

  const catParts = await prisma.productCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CAT-PART' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'CAT-PART',
      nameEn: 'Spare Parts',
      nameAr: 'قطع الغيار',
      description: 'Engine, brakes, suspension and maintenance parts',
    },
  });

  const catOils = await prisma.productCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CAT-OIL' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'CAT-OIL',
      nameEn: 'Oils & Fluids',
      nameAr: 'الزيوت والسوائل',
      description: 'Engine oils, brake fluids, and lubricants',
    },
  });

  // Brands
  const brandHonda = await prisma.brand.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'HONDA' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'HONDA',
      nameEn: 'Honda',
      nameAr: 'هوندا',
      country: 'Japan',
    },
  });

  const brandYamaha = await prisma.brand.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'YAMAHA' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'YAMAHA',
      nameEn: 'Yamaha',
      nameAr: 'ياماها',
      country: 'Japan',
    },
  });

  const brandSym = await prisma.brand.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SYM' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'SYM',
      nameEn: 'SYM',
      nameAr: 'إس واي إم',
      country: 'Taiwan',
    },
  });

  // Vehicle Models
  const modelSymJet4 = await prisma.vehicleModel.upsert({
    where: { brandId_code: { brandId: brandSym.id, code: 'JET4-150' } },
    update: {},
    create: {
      brandId: brandSym.id,
      code: 'JET4-150',
      nameEn: 'SYM Jet 4 150cc',
      nameAr: 'إس واي إم جيت 4 150 سي سي',
      category: 'SCOOTER',
      yearFrom: 2021,
      yearTo: 2025,
      engineCapacity: 150,
      engineType: '4-Stroke Single Cylinder',
      transmission: 'CVT Automatic',
    },
  });

  const modelHondaCg125 = await prisma.vehicleModel.upsert({
    where: { brandId_code: { brandId: brandHonda.id, code: 'CG-125' } },
    update: {},
    create: {
      brandId: brandHonda.id,
      code: 'CG-125',
      nameEn: 'Honda CG 125',
      nameAr: 'هوندا سي جي 125',
      category: 'MOTORCYCLE',
      yearFrom: 2020,
      yearTo: 2025,
      engineCapacity: 125,
      engineType: '4-Stroke OHV',
      transmission: '5-Speed Manual',
    },
  });

  // Products: 1 Vehicle Product, 1 Spare Part Product, 1 Oil Product
  const prodScooter = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: org.id, sku: 'VEH-SYM-JET4' } },
    update: {},
    create: {
      organizationId: org.id,
      categoryId: catVehicles.id,
      brandId: brandSym.id,
      vehicleModelId: modelSymJet4.id,
      sku: 'VEH-SYM-JET4',
      barcode: '622100010001',
      nameEn: 'SYM Jet 4 Scooter 150cc',
      nameAr: 'سكوتر إس واي إم جيت 4 150 سي سي',
      type: 'VEHICLE',
      unitOfMeasure: 'UNIT',
      costPrice: 42000,
      retailPrice: 51000,
      b2bPrice: 47000,
      wholesalePrice: 46000,
      minStockAlert: 2,
    },
  });

  const prodBrakePad = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: org.id, sku: 'PART-BRK-SYM' } },
    update: {},
    create: {
      organizationId: org.id,
      categoryId: catParts.id,
      brandId: brandSym.id,
      sku: 'PART-BRK-SYM',
      barcode: '622100020002',
      nameEn: 'Front Brake Pads SYM Jet 4',
      nameAr: 'تيل فرامل أمامي إس واي إم جيت 4',
      type: 'SPARE_PART',
      unitOfMeasure: 'SET',
      costPrice: 220,
      retailPrice: 350,
      b2bPrice: 290,
      wholesalePrice: 280,
      minStockAlert: 5,
    },
  });

  // Spare part info
  await prisma.sparePartInfo.upsert({
    where: { productId: prodBrakePad.id },
    update: {},
    create: {
      productId: prodBrakePad.id,
      oemNumber: 'SYM-45105-X01',
      compatibleModels: 'SYM Jet 4 150, SYM Symphony S/SR',
      supplierName: 'SYM Taiwan Parts Co.',
      warrantyMonths: 6,
      defaultShelf: 'A-02-B',
    },
  });

  const prodOil = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: org.id, sku: 'OIL-MOTUL-10W40' } },
    update: {},
    create: {
      organizationId: org.id,
      categoryId: catOils.id,
      sku: 'OIL-MOTUL-10W40',
      barcode: '622100030003',
      nameEn: 'Motul 7100 4T 10W-40 Synthetic 1L',
      nameAr: 'زيت موتول 7100 تخليقي 10W-40 سعة 1 لتر',
      type: 'OIL',
      unitOfMeasure: 'BOTTLE',
      costPrice: 380,
      retailPrice: 520,
      b2bPrice: 450,
      wholesalePrice: 440,
      minStockAlert: 10,
    },
  });

  // Stock Balances for HQ Warehouse
  await prisma.stockBalance.upsert({
    where: { warehouseId_productId: { warehouseId: whHq.id, productId: prodScooter.id } },
    update: { quantity: 3, availableQty: 3 },
    create: {
      warehouseId: whHq.id,
      productId: prodScooter.id,
      quantity: 3,
      availableQty: 3,
      avgCost: 42000,
    },
  });

  await prisma.stockBalance.upsert({
    where: { warehouseId_productId: { warehouseId: whHq.id, productId: prodBrakePad.id } },
    update: { quantity: 25, availableQty: 25 },
    create: {
      warehouseId: whHq.id,
      productId: prodBrakePad.id,
      quantity: 25,
      availableQty: 25,
      avgCost: 220,
    },
  });

  await prisma.stockBalance.upsert({
    where: { warehouseId_productId: { warehouseId: whHq.id, productId: prodOil.id } },
    update: { quantity: 40, availableQty: 40 },
    create: {
      warehouseId: whHq.id,
      productId: prodOil.id,
      quantity: 40,
      availableQty: 40,
      avgCost: 380,
    },
  });

  // Stock Movement for Opening Balance
  await prisma.stockMovement.upsert({
    where: { movementNumber: 'MOV-INIT-001' },
    update: {},
    create: {
      movementNumber: 'MOV-INIT-001',
      movementType: 'PURCHASE_IN',
      productId: prodBrakePad.id,
      warehouseId: whHq.id,
      branchId: hqBranch.id,
      quantity: 25,
      unitCost: 220,
      totalCost: 5500,
      beforeQuantity: 0,
      afterQuantity: 25,
      referenceType: 'PURCHASE_ORDER',
      referenceNumber: 'PO-2026-0001',
      notes: 'Initial warehouse stocking',
      createdById: adminUser.id,
    },
  });

  // Seed 2 Vehicle Units
  await prisma.vehicleUnit.upsert({
    where: { vin: 'LSGPC150M90012345' },
    update: {},
    create: {
      productId: prodScooter.id,
      modelId: modelSymJet4.id,
      branchId: hqBranch.id,
      warehouseId: whHq.id,
      vin: 'LSGPC150M90012345',
      engineNumber: 'SYM1P57QMJ-01234',
      color: 'Matte Black',
      modelYear: 2024,
      status: 'AVAILABLE',
      purchaseCost: 42000,
      sellingPrice: 51000,
      b2bPrice: 47000,
      keyNumber: 'K-901',
      batteryNumber: 'BAT-12V7AH-01',
    },
  });

  await prisma.vehicleUnit.upsert({
    where: { vin: 'LSGPC150M90012346' },
    update: {},
    create: {
      productId: prodScooter.id,
      modelId: modelSymJet4.id,
      branchId: hqBranch.id,
      warehouseId: whHq.id,
      vin: 'LSGPC150M90012346',
      engineNumber: 'SYM1P57QMJ-01235',
      color: 'Pearl White',
      modelYear: 2024,
      status: 'AVAILABLE',
      purchaseCost: 42000,
      sellingPrice: 51000,
      b2bPrice: 47000,
      keyNumber: 'K-902',
      batteryNumber: 'BAT-12V7AH-02',
    },
  });

  console.log('Seed completed successfully with Phase 2 entities!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
