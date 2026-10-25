import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';

/**
 * Standard Default Chart of Accounts for Dealerships & Workshops
 */
export const DEFAULT_CHART_OF_ACCOUNTS = [
  // 1. ASSETS (الأصول)
  { code: '1', nameEn: 'Assets', nameAr: 'الأصول', type: 'ASSET', category: 'HEADER', isDebit: true, level: 1 },
  
  // 11. Current Assets (الأصول المتداولة)
  { code: '11', nameEn: 'Current Assets', nameAr: 'الأصول المتداولة', type: 'ASSET', category: 'HEADER', parentCode: '1', isDebit: true, level: 2 },
  { code: '1101', nameEn: 'Cash on Hand (Treasury)', nameAr: 'النقدية بالصندوق (الخزينة الرئيسية)', type: 'ASSET', category: 'CASH', parentCode: '11', isDebit: true, level: 3, isSystem: true },
  { code: '1102', nameEn: 'Bank Accounts', nameAr: 'البنوك والحسابات الجارية', type: 'ASSET', category: 'BANK', parentCode: '11', isDebit: true, level: 3, isSystem: true },
  { code: '1103', nameEn: 'Accounts Receivable (Customers)', nameAr: 'العملاء والمدينون', type: 'ASSET', category: 'ACCOUNTS_RECEIVABLE', parentCode: '11', isDebit: true, level: 3, isSystem: true },
  { code: '1104', nameEn: 'Inventory - Vehicles', nameAr: 'مخزون الدراجات والمركبات', type: 'ASSET', category: 'INVENTORY', parentCode: '11', isDebit: true, level: 3, isSystem: true },
  { code: '1105', nameEn: 'Inventory - Spare Parts & Accessories', nameAr: 'مخزون قطع الغيار والإكسسوارات', type: 'ASSET', category: 'INVENTORY', parentCode: '11', isDebit: true, level: 3, isSystem: true },
  { code: '1106', nameEn: 'Input VAT (Tax Receivable)', nameAr: 'ضريبة القيمة المضافة على المشتريات (مدخلات)', type: 'ASSET', category: 'TAX_RECEIVABLE', parentCode: '11', isDebit: true, level: 3, isSystem: true },
  { code: '1107', nameEn: 'Employee Advances', nameAr: 'سلف وعهد الموظفين', type: 'ASSET', category: 'ADVANCES', parentCode: '11', isDebit: true, level: 3, isSystem: true },

  // 12. Non-Current Assets (الأصول الثابتة)
  { code: '12', nameEn: 'Fixed Assets', nameAr: 'الأصول الثابتة', type: 'ASSET', category: 'HEADER', parentCode: '1', isDebit: true, level: 2 },
  { code: '1201', nameEn: 'Workshop Tools & Machinery', nameAr: 'عدد وأدوات وآلات الورشة', type: 'ASSET', category: 'FIXED_ASSETS', parentCode: '12', isDebit: true, level: 3 },
  { code: '1202', nameEn: 'Showroom Furniture & Fixtures', nameAr: 'أثاث وتجهيزات المعرض', type: 'ASSET', category: 'FIXED_ASSETS', parentCode: '12', isDebit: true, level: 3 },
  { code: '1203', nameEn: 'Accumulated Depreciation', nameAr: 'مجمع الإهلاك للأصول الثابتة', type: 'ASSET', category: 'ACCUMULATED_DEPRECIATION', parentCode: '12', isDebit: false, level: 3 },

  // 2. LIABILITIES (الالتزامات / الخصوم)
  { code: '2', nameEn: 'Liabilities', nameAr: 'الالتزامات', type: 'LIABILITY', category: 'HEADER', isDebit: false, level: 1 },
  
  // 21. Current Liabilities (الالتزامات المتداولة)
  { code: '21', nameEn: 'Current Liabilities', nameAr: 'الالتزامات المتداولة', type: 'LIABILITY', category: 'HEADER', parentCode: '2', isDebit: false, level: 2 },
  { code: '2101', nameEn: 'Accounts Payable (Suppliers)', nameAr: 'الموردون والدائنون', type: 'LIABILITY', category: 'ACCOUNTS_PAYABLE', parentCode: '21', isDebit: false, level: 3, isSystem: true },
  { code: '2102', nameEn: 'Output VAT (Tax Payable)', nameAr: 'ضريبة القيمة المضافة على المبيعات (مخرجات)', type: 'LIABILITY', category: 'TAX_PAYABLE', parentCode: '21', isDebit: false, level: 3, isSystem: true },
  { code: '2103', nameEn: 'Accrued Salaries & Wages', nameAr: 'الرواتب والأجور المستحقة', type: 'LIABILITY', category: 'ACCRUED_EXPENSES', parentCode: '21', isDebit: false, level: 3, isSystem: true },
  { code: '2104', nameEn: 'Customer Deposits & Down Payments', nameAr: 'عربونات ودفعات مقدمة من العملاء', type: 'LIABILITY', category: 'DEPOSITS', parentCode: '21', isDebit: false, level: 3, isSystem: true },
  { code: '2105', nameEn: 'Social Insurance Payable', nameAr: 'مستحقات التأمينات الاجتماعية', type: 'LIABILITY', category: 'ACCRUED_EXPENSES', parentCode: '21', isDebit: false, level: 3 },

  // 3. EQUITY (حقوق الملكية)
  { code: '3', nameEn: 'Equity', nameAr: 'حقوق الملكية', type: 'EQUITY', category: 'HEADER', isDebit: false, level: 1 },
  { code: '3101', nameEn: 'Capital', nameAr: 'رأس المال', type: 'EQUITY', category: 'CAPITAL', parentCode: '3', isDebit: false, level: 2, isSystem: true },
  { code: '3102', nameEn: 'Retained Earnings', nameAr: 'الأرباح (الخسائر) المرحلة', type: 'EQUITY', category: 'RETAINED_EARNINGS', parentCode: '3', isDebit: false, level: 2, isSystem: true },
  { code: '3103', nameEn: 'Current Year Profit/Loss', nameAr: 'أرباح / خسائر العام الحالي', type: 'EQUITY', category: 'CURRENT_EARNINGS', parentCode: '3', isDebit: false, level: 2, isSystem: true },

  // 4. REVENUES (الإيرادات)
  { code: '4', nameEn: 'Revenues', nameAr: 'الإيرادات', type: 'REVENUE', category: 'HEADER', isDebit: false, level: 1 },
  { code: '4101', nameEn: 'Vehicle Sales Revenue', nameAr: 'إيرادات مبيعات المركبات والدراجات', type: 'REVENUE', category: 'SALES_REVENUE', parentCode: '4', isDebit: false, level: 2, isSystem: true },
  { code: '4102', nameEn: 'Spare Parts & Accessories Sales', nameAr: 'إيرادات مبيعات قطع الغيار والإكسسوارات', type: 'REVENUE', category: 'SALES_REVENUE', parentCode: '4', isDebit: false, level: 2, isSystem: true },
  { code: '4103', nameEn: 'Maintenance & Service Labor Revenue', nameAr: 'إيرادات أجور صيانة ومصنعيات الورشة', type: 'REVENUE', category: 'SERVICE_REVENUE', parentCode: '4', isDebit: false, level: 2, isSystem: true },
  { code: '4104', nameEn: 'Discounts Allowed (Sales Discounts)', nameAr: 'الخصم المسموح به (خصومات المبيعات)', type: 'REVENUE', category: 'SALES_DISCOUNT', parentCode: '4', isDebit: true, level: 2, isSystem: true },
  { code: '4105', nameEn: 'Other Miscellaneous Income', nameAr: 'إيرادات أخرى متنوعة', type: 'REVENUE', category: 'OTHER_INCOME', parentCode: '4', isDebit: false, level: 2 },

  // 5. COST OF GOODS SOLD (تكلفة البضاعة المباعة)
  { code: '5', nameEn: 'Cost of Goods Sold (COGS)', nameAr: 'تكلفة البضاعة والخدمات المباعة', type: 'EXPENSE', category: 'HEADER', isDebit: true, level: 1 },
  { code: '5101', nameEn: 'Cost of Vehicles Sold', nameAr: 'تكلفة مبيعات الدراجات والمركبات', type: 'EXPENSE', category: 'COGS', parentCode: '5', isDebit: true, level: 2, isSystem: true },
  { code: '5102', nameEn: 'Cost of Spare Parts Sold', nameAr: 'تكلفة مبيعات قطع الغيار', type: 'EXPENSE', category: 'COGS', parentCode: '5', isDebit: true, level: 2, isSystem: true },
  { code: '5103', nameEn: 'Cost of Workshop Consumed Parts', nameAr: 'تكلفة قطع الغيار المستخدمة في الصيانة', type: 'EXPENSE', category: 'COGS', parentCode: '5', isDebit: true, level: 2, isSystem: true },
  { code: '5104', nameEn: 'Discounts Received (Purchase Discounts)', nameAr: 'الخصم المكتسب (خصومات المشتريات)', type: 'EXPENSE', category: 'PURCHASE_DISCOUNT', parentCode: '5', isDebit: false, level: 2, isSystem: true },

  // 6. OPERATING EXPENSES (المصروفات التشغيلية والعمومية)
  { code: '6', nameEn: 'Operating & Admin Expenses', nameAr: 'المصروفات التشغيلية والعمومية', type: 'EXPENSE', category: 'HEADER', isDebit: true, level: 1 },
  { code: '6101', nameEn: 'Salaries & Staff Compensation', nameAr: 'الرواتب والأجور ومكافآت العاملين', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2, isSystem: true },
  { code: '6102', nameEn: 'Showroom & Workshop Rent', nameAr: 'إيجار المعارض والورش والمخازن', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2 },
  { code: '6103', nameEn: 'Utilities (Electricity, Water, Internet)', nameAr: 'مرافق ومنافع (كهرباء، مياه، هاتف، إنترنت)', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2 },
  { code: '6104', nameEn: 'Marketing & Advertising', nameAr: 'دعاية وإعلان وتسويق', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2 },
  { code: '6105', nameEn: 'Maintenance & Repairs (Showroom/Tools)', nameAr: 'صيانة دورية للمقر والمعدات', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2 },
  { code: '6106', nameEn: 'Hospitality & Office Supplies', nameAr: 'أدوات مكتبية وضيافة وبوفيه', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2 },
  { code: '6107', nameEn: 'Transportation, Shipping & Fuel', nameAr: 'انتقالات ومحروقات وشحن بضائع', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2 },
  { code: '6108', nameEn: 'Depreciation Expense', nameAr: 'مصروف إهلاك الأصول الثابتة', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2 },
  { code: '6109', nameEn: 'Bank Charges & Commissions', nameAr: 'عمولات ورسوم بنكية', type: 'EXPENSE', category: 'OPERATING_EXPENSE', parentCode: '6', isDebit: true, level: 2 },
];

/**
 * Standard Mapping Keys for Automated Transaction Posting
 */
export const DEFAULT_ACCOUNT_MAPPINGS: Record<string, string> = {
  DEFAULT_CASH: '1101',              // النقدية بالصندوق
  DEFAULT_BANK: '1102',              // البنك الافتراضي
  AR_CONTROL: '1103',                // حساب العملاء (حساب المراقبة)
  INVENTORY_VEHICLES: '1104',        // مخزون الدراجات
  INVENTORY_PARTS: '1105',           // مخزون قطع الغيار
  VAT_INPUT: '1106',                 // ضريبة مدخلات مشتريات
  EMPLOYEE_ADVANCES: '1107',         // سلف الموظفين
  AP_CONTROL: '2101',                // حساب الموردين (حساب المراقبة)
  VAT_OUTPUT: '2102',                // ضريبة مخرجات مبيعات
  PAYROLL_PAYABLE: '2103',           // رواتب مستحقة الدفع
  CUSTOMER_DEPOSITS: '2104',         // عربونات العملاء
  SALES_REVENUE_VEHICLES: '4101',    // إيراد بيع دراجات
  SALES_REVENUE_PARTS: '4102',       // إيراد بيع قطع غيار
  SERVICE_REVENUE: '4103',           // إيراد صيانة ومصنعية الورشة
  SALES_DISCOUNT: '4104',            // خصم مبيعات مسموح به
  COGS_VEHICLES: '5101',             // تكلفة مركبات مباعة
  COGS_PARTS: '5102',                // تكلفة قطع غيار مباعة
  COGS_WORKSHOP_PARTS: '5103',       // تكلفة قطع غيار مستخدمة في الصيانة
  PURCHASE_DISCOUNT: '5104',         // خصم مكتسب على المشتريات
  PAYROLL_EXPENSE: '6101',           // مصروف الرواتب
  DEFAULT_EXPENSE: '6106',           // مصروف عام
};

export class AccountingService {
  /**
   * Initialize standard Chart of Accounts & Mappings for an Organization if not already seeded
   */
  async initializeOrganizationAccounts(orgId: string, userId?: string) {
    const existingCount = await prisma.account.count({ where: { organizationId: orgId } });
    if (existingCount > 0) return; // already initialized

    // 1. Create Accounts sequentially to handle parent-child hierarchy
    const codeToIdMap = new Map<string, string>();

    for (const acc of DEFAULT_CHART_OF_ACCOUNTS) {
      const parentId = acc.parentCode ? codeToIdMap.get(acc.parentCode) : null;
      const created = await prisma.account.create({
        data: {
          organizationId: orgId,
          code: acc.code,
          nameEn: acc.nameEn,
          nameAr: acc.nameAr,
          type: acc.type,
          category: acc.category,
          parentId: parentId || null,
          level: acc.level,
          isDebit: acc.isDebit,
          isSystem: !!(acc as any).isSystem,
          isActive: true,
        },
      });
      codeToIdMap.set(acc.code, created.id);
    }

    // 2. Initialize Default Account Mappings
    for (const [key, code] of Object.entries(DEFAULT_ACCOUNT_MAPPINGS)) {
      const accountId = codeToIdMap.get(code);
      if (accountId) {
        await prisma.accountMapping.upsert({
          where: {
            organizationId_mappingKey: {
              organizationId: orgId,
              mappingKey: key,
            },
          },
          update: { accountId },
          create: {
            organizationId: orgId,
            mappingKey: key,
            accountId,
            description: `Auto-mapped to ${code}`,
          },
        });
      }
    }

    // 3. Ensure a current Fiscal Year and Period exist
    const currentYear = new Date().getFullYear();
    const fiscalYear = await prisma.fiscalYear.upsert({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: `السنة المالية ${currentYear}`,
        },
      },
      update: {},
      create: {
        organizationId: orgId,
        name: `السنة المالية ${currentYear}`,
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31, 23, 59, 59),
      },
    });

    const monthStr = new Date().toISOString().slice(0, 7);
    await prisma.accountingPeriod.upsert({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: monthStr,
        },
      },
      update: {},
      create: {
        organizationId: orgId,
        fiscalYearId: fiscalYear.id,
        name: monthStr,
        periodNumber: new Date().getMonth() + 1,
        startDate: new Date(currentYear, new Date().getMonth(), 1),
        endDate: new Date(currentYear, new Date().getMonth() + 1, 0, 23, 59, 59),
      },
    });

    // 4. Create default cash register for headquarters branch if branches exist
    const branches = await prisma.branch.findMany({ where: { organizationId: orgId } });
    const cashAccountId = codeToIdMap.get('1101');
    if (cashAccountId) {
      for (const branch of branches) {
        await prisma.cashRegister.upsert({
          where: {
            branchId_code: {
              branchId: branch.id,
              code: `CASH-${branch.code}`,
            },
          },
          update: {},
          create: {
            organizationId: orgId,
            branchId: branch.id,
            accountId: cashAccountId,
            code: `CASH-${branch.code}`,
            nameEn: `Cash Drawer - ${branch.nameEn}`,
            nameAr: `خزينة ${branch.nameAr}`,
          },
        });
      }
    }
  }

  /**
   * Helper to resolve account by configured mapping key with fallback
   */
  async getMappedAccount(orgId: string, mappingKey: string): Promise<string> {
    const mapping = await prisma.accountMapping.findUnique({
      where: {
        organizationId_mappingKey: {
          organizationId: orgId,
          mappingKey,
        },
      },
    });

    if (mapping?.accountId) return mapping.accountId;

    // Fallback: look up by default code
    const defaultCode = DEFAULT_ACCOUNT_MAPPINGS[mappingKey];
    if (defaultCode) {
      const acc = await prisma.account.findFirst({
        where: { organizationId: orgId, code: defaultCode },
      });
      if (acc) return acc.id;
    }

    throw new AppError(`Account mapping '${mappingKey}' is not configured for this organization.`, 400);
  }

  // ==========================================
  // 1. CHART OF ACCOUNTS (CRUD & TREE)
  // ==========================================
  async listAccounts(orgId: string, { type, search }: any) {
    await this.initializeOrganizationAccounts(orgId);

    const where: any = { organizationId: orgId };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { nameEn: { contains: search } },
        { nameAr: { contains: search } },
      ];
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        parent: true,
        _count: { select: { children: true, journalLines: true } },
      },
      orderBy: { code: 'asc' },
    });

    return accounts;
  }

  async getAccountById(id: string) {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { journalLines: true } },
      },
    });
    if (!account) throw new AppError('Account not found', 404);
    return account;
  }

  async createAccount(orgId: string, data: any) {
    const existing = await prisma.account.findUnique({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: data.code,
        },
      },
    });
    if (existing) throw new AppError(`Account code '${data.code}' already exists.`, 400);

    let level = 1;
    let isDebit = data.isDebit;
    if (data.parentId) {
      const parent = await prisma.account.findUnique({ where: { id: data.parentId } });
      if (parent) {
        level = parent.level + 1;
        if (isDebit === undefined) isDebit = parent.isDebit;
      }
    }

    return prisma.account.create({
      data: {
        organizationId: orgId,
        code: data.code,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        type: data.type,
        category: data.category || 'GENERAL',
        parentId: data.parentId || null,
        level,
        isDebit: isDebit !== undefined ? isDebit : true,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: { parent: true },
    });
  }

  async updateAccount(id: string, data: any) {
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) throw new AppError('Account not found', 404);
    if (account.isSystem && data.code && data.code !== account.code) {
      throw new AppError('Cannot change code of system account.', 400);
    }

    return prisma.account.update({
      where: { id },
      data: {
        nameEn: data.nameEn || account.nameEn,
        nameAr: data.nameAr || account.nameAr,
        description: data.description !== undefined ? data.description : account.description,
        isActive: data.isActive !== undefined ? data.isActive : account.isActive,
      },
    });
  }

  // ==========================================
  // 2. JOURNAL ENTRIES (DOUBLE-ENTRY ENGINE)
  // ==========================================
  /**
   * Post a balanced double-entry journal entry.
   * Enforces:
   * 1. Total Debit == Total Credit (Precision to 2 decimals)
   * 2. Accounting period must be OPEN (Period control)
   * 3. Cannot post to closed fiscal years
   * 4. Updates running balance on every touched Account
   */
  async createJournalEntry(orgId: string, data: {
    branchId: string;
    entryDate?: Date | string;
    sourceType: string;
    sourceId?: string;
    sourceNumber?: string;
    narration: string;
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
      costCenter?: string;
      partnerType?: string;
      partnerId?: string;
    }>;
    userId: string;
  }, txPrisma?: any) {
    const client = txPrisma || prisma;
    const entryDate = data.entryDate ? new Date(data.entryDate) : new Date();

    // 1. Period & Year Controls
    const monthStr = entryDate.toISOString().slice(0, 7);
    const period = await client.accountingPeriod.findFirst({
      where: { organizationId: orgId, name: monthStr },
      include: { fiscalYear: true },
    });

    if (period) {
      if (period.isClosed) {
        throw new AppError(`Accounting period '${monthStr}' is closed. Journal entries cannot be posted.`, 400);
      }
      if (period.fiscalYear.isClosed) {
        throw new AppError(`Fiscal year '${period.fiscalYear.name}' is closed.`, 400);
      }
    }

    // 2. Validate Lines & Balance Equation
    if (!data.lines || data.lines.length < 2) {
      throw new AppError('Journal entry must contain at least 2 lines (debit & credit).', 400);
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of data.lines) {
      const d = Number(line.debit) || 0;
      const c = Number(line.credit) || 0;
      if (d < 0 || c < 0) throw new AppError('Debit and Credit amounts cannot be negative.', 400);
      if (d === 0 && c === 0) throw new AppError('Line amount cannot be zero for both debit and credit.', 400);
      totalDebit += d;
      totalCredit += c;
    }

    // Floating-point round to 2 decimal places
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new AppError(`Unbalanced Journal Entry: Total Debit (${totalDebit}) does not equal Total Credit (${totalCredit}).`, 400);
    }

    const entryNumber = `JE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 3. Create Entry & Lines
    const entry = await client.journalEntry.create({
      data: {
        entryNumber,
        organizationId: orgId,
        branchId: data.branchId,
        periodId: period?.id || null,
        entryDate,
        sourceType: data.sourceType,
        sourceId: data.sourceId || null,
        sourceNumber: data.sourceNumber || null,
        narration: data.narration,
        totalDebit,
        totalCredit,
        status: 'POSTED',
        createdById: data.userId,
        postedById: data.userId,
        postedAt: new Date(),
        lines: {
          create: data.lines.map(l => ({
            accountId: l.accountId,
            branchId: data.branchId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description || data.narration,
            costCenter: l.costCenter || null,
            partnerType: l.partnerType || null,
            partnerId: l.partnerId || null,
          })),
        },
      },
      include: {
        lines: { include: { account: true } },
      },
    });

    // 4. Update running balances for accounts
    for (const line of data.lines) {
      const acc = await client.account.findUnique({ where: { id: line.accountId } });
      if (acc) {
        // If account normal balance is Debit: balance += debit - credit
        // If normal balance is Credit: balance += credit - debit
        const change = acc.isDebit
          ? ((Number(line.debit) || 0) - (Number(line.credit) || 0))
          : ((Number(line.credit) || 0) - (Number(line.debit) || 0));

        await client.account.update({
          where: { id: line.accountId },
          data: { currentBalance: { increment: change } },
        });
      }
    }

    return entry;
  }

  /**
   * Reverse an existing posted journal entry (audit-safe, creates reverse entry)
   */
  async reverseJournalEntry(id: string, reason: string, userId: string) {
    const original = await prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!original) throw new AppError('Journal entry not found', 404);
    if (original.isReversed) throw new AppError('Journal entry is already reversed', 400);

    return prisma.$transaction(async (tx) => {
      // Create opposite lines: debits become credits, credits become debits
      const reverseLines = original.lines.map(l => ({
        accountId: l.accountId,
        debit: l.credit,
        credit: l.debit,
        description: `عكس قيد: ${original.entryNumber} - ${reason}`,
      }));

      const reversal = await this.createJournalEntry(original.organizationId, {
        branchId: original.branchId,
        entryDate: new Date(),
        sourceType: 'REVERSAL',
        sourceId: original.id,
        sourceNumber: original.entryNumber,
        narration: `عكس قيد رقم ${original.entryNumber}: ${reason}`,
        lines: reverseLines,
        userId,
      }, tx);

      await tx.journalEntry.update({
        where: { id },
        data: {
          isReversed: true,
          reversedEntryId: reversal.id,
          status: 'REVERSED',
        },
      });

      return reversal;
    });
  }

  async listJournalEntries(orgId: string, {
    branchId,
    sourceType,
    startDate,
    endDate,
    search,
    skip = 0,
    limit = 50,
  }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (sourceType) where.sourceType = sourceType;

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { entryNumber: { contains: search } },
        { narration: { contains: search } },
        { sourceNumber: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        include: {
          branch: true,
          lines: { include: { account: true } },
        },
        orderBy: { entryDate: 'desc' },
      }),
    ]);

    return { total, data };
  }

  // ==========================================
  // 3. GENERAL LEDGER (دفتر الأستاذ العام)
  // ==========================================
  async getGeneralLedger(orgId: string, {
    accountId,
    branchId,
    startDate,
    endDate,
  }: any) {
    const where: any = {
      journalEntry: {
        organizationId: orgId,
        status: { in: ['POSTED', 'REVERSED'] },
      },
    };

    if (accountId) where.accountId = accountId;
    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.journalEntry.entryDate = {};
      if (startDate) where.journalEntry.entryDate.gte = new Date(startDate);
      if (endDate) where.journalEntry.entryDate.lte = new Date(endDate);
    }

    const lines = await prisma.journalEntryLine.findMany({
      where,
      include: {
        account: true,
        journalEntry: {
          include: { branch: true },
        },
      },
      orderBy: [
        { journalEntry: { entryDate: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    // Group by Account with running balance
    const accountsMap = new Map<string, any>();

    for (const line of lines) {
      if (!accountsMap.has(line.accountId)) {
        accountsMap.set(line.accountId, {
          account: line.account,
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
          transactions: [],
        });
      }

      const grp = accountsMap.get(line.accountId);
      grp.totalDebit += line.debit;
      grp.totalCredit += line.credit;

      const change = line.account.isDebit
        ? (line.debit - line.credit)
        : (line.credit - line.debit);
      grp.closingBalance += change;

      grp.transactions.push({
        id: line.id,
        entryNumber: line.journalEntry.entryNumber,
        entryDate: line.journalEntry.entryDate,
        branchName: line.journalEntry.branch?.nameAr || line.journalEntry.branch?.nameEn,
        sourceType: line.journalEntry.sourceType,
        sourceNumber: line.journalEntry.sourceNumber,
        description: line.description || line.journalEntry.narration,
        debit: line.debit,
        credit: line.credit,
        runningBalance: grp.closingBalance,
      });
    }

    return Array.from(accountsMap.values());
  }

  // ==========================================
  // 4. CASH REGISTERS & BANKS
  // ==========================================
  async listCashRegisters(orgId: string, branchId?: string) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    return prisma.cashRegister.findMany({
      where,
      include: { branch: true, account: true },
    });
  }

  async createCashRegister(orgId: string, data: any) {
    return prisma.cashRegister.create({
      data: {
        organizationId: orgId,
        branchId: data.branchId,
        accountId: data.accountId,
        code: data.code,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        currency: data.currency || 'EGP',
      },
      include: { branch: true, account: true },
    });
  }

  async listBankAccounts(orgId: string, branchId?: string) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    return prisma.bankAccount.findMany({
      where,
      include: { branch: true, account: true },
    });
  }

  async createBankAccount(orgId: string, data: any) {
    return prisma.bankAccount.create({
      data: {
        organizationId: orgId,
        branchId: data.branchId || null,
        accountId: data.accountId,
        bankName: data.bankName,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        iban: data.iban || null,
        swiftCode: data.swiftCode || null,
        currency: data.currency || 'EGP',
      },
      include: { branch: true, account: true },
    });
  }

  // ==========================================
  // 5. EXPENSES ENGINE (مصروفات تشغيلية وعمومية)
  // ==========================================
  async listExpenses(orgId: string, { branchId, startDate, endDate, category, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { expenseNumber: { contains: search } },
        { description: { contains: search } },
        { payee: { contains: search } },
        { referenceNo: { contains: search } },
      ];
    }

    return prisma.expense.findMany({
      where,
      include: {
        branch: true,
        expenseAccount: true,
        cashRegister: true,
        bankAccount: true,
      },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async createExpense(orgId: string, data: any, userId: string) {
    return prisma.$transaction(async (tx) => {
      const expenseNumber = `EXP-${Date.now()}`;
      const amount = Number(data.amount);
      const taxRate = Number(data.taxRate || 0);
      const taxAmount = (amount * taxRate) / 100;
      const grandTotal = amount + taxAmount;

      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          organizationId: orgId,
          branchId: data.branchId,
          expenseAccountId: data.expenseAccountId,
          paymentSource: data.paymentSource, // CASH, BANK, AP
          cashRegisterId: data.cashRegisterId || null,
          bankAccountId: data.bankAccountId || null,
          supplierId: data.supplierId || null,
          amount,
          taxRate,
          taxAmount,
          grandTotal,
          expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
          referenceNo: data.referenceNo || null,
          payee: data.payee || null,
          category: data.category || 'OTHER',
          description: data.description,
          createdById: userId,
        },
      });

      // Post Journal Entry automatically:
      // Dr. Expense Account (amount)
      // Dr. VAT Input (taxAmount if any)
      // Cr. Cash / Bank Account (grandTotal)
      let creditAccountId: string;
      if (data.paymentSource === 'CASH' && data.cashRegisterId) {
        const cr = await tx.cashRegister.findUnique({ where: { id: data.cashRegisterId } });
        creditAccountId = cr?.accountId || await this.getMappedAccount(orgId, 'DEFAULT_CASH');
      } else if (data.paymentSource === 'BANK' && data.bankAccountId) {
        const ba = await tx.bankAccount.findUnique({ where: { id: data.bankAccountId } });
        creditAccountId = ba?.accountId || await this.getMappedAccount(orgId, 'DEFAULT_BANK');
      } else {
        creditAccountId = await this.getMappedAccount(orgId, 'DEFAULT_CASH');
      }

      const lines: any[] = [
        {
          accountId: data.expenseAccountId,
          debit: amount,
          credit: 0,
          description: data.description,
        },
      ];

      if (taxAmount > 0) {
        const vatInputAcc = await this.getMappedAccount(orgId, 'VAT_INPUT');
        lines.push({
          accountId: vatInputAcc,
          debit: taxAmount,
          credit: 0,
          description: `ضريبة مدخلات مصروف ${expenseNumber}`,
        });
      }

      lines.push({
        accountId: creditAccountId,
        debit: 0,
        credit: grandTotal,
        description: `سداد مصروف ${data.description}`,
      });

      const je = await this.createJournalEntry(orgId, {
        branchId: data.branchId,
        entryDate: expense.expenseDate,
        sourceType: 'EXPENSE',
        sourceId: expense.id,
        sourceNumber: expense.expenseNumber,
        narration: `مصروف: ${data.description} (${data.payee || 'بدون جهة'})`,
        lines,
        userId,
      }, tx);

      await tx.expense.update({
        where: { id: expense.id },
        data: { journalEntryId: je.id },
      });

      return expense;
    });
  }

  // ==========================================
  // 6. ACCOUNT MAPPINGS CONFIGURATION
  // ==========================================
  async listAccountMappings(orgId: string) {
    await this.initializeOrganizationAccounts(orgId);
    return prisma.accountMapping.findMany({
      where: { organizationId: orgId },
      orderBy: { mappingKey: 'asc' },
    });
  }

  async updateAccountMapping(orgId: string, mappingKey: string, accountId: string) {
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    if (!acc) throw new AppError('Target account not found', 404);

    return prisma.accountMapping.upsert({
      where: {
        organizationId_mappingKey: {
          organizationId: orgId,
          mappingKey,
        },
      },
      update: { accountId },
      create: {
        organizationId: orgId,
        mappingKey,
        accountId,
      },
    });
  }

  // ==========================================
  // 7. FINANCIAL STATEMENTS & REPORTS
  // ==========================================

  /**
   * 1. TRIAL BALANCE (ميزان المراجعة بالمجاميع والأرصدة)
   */
  async getTrialBalance(orgId: string, { branchId, startDate, endDate }: any) {
    const whereLine: any = {
      journalEntry: {
        organizationId: orgId,
        status: { in: ['POSTED', 'REVERSED'] },
      },
    };

    if (branchId) whereLine.branchId = branchId;
    if (startDate || endDate) {
      whereLine.journalEntry.entryDate = {};
      if (startDate) whereLine.journalEntry.entryDate.gte = new Date(startDate);
      if (endDate) whereLine.journalEntry.entryDate.lte = new Date(endDate);
    }

    const [accounts, lines] = await Promise.all([
      prisma.account.findMany({
        where: { organizationId: orgId, isActive: true },
        orderBy: { code: 'asc' },
      }),
      prisma.journalEntryLine.findMany({
        where: whereLine,
        select: {
          accountId: true,
          debit: true,
          credit: true,
        },
      }),
    ]);

    // Aggregate debits & credits per account
    const totalsMap = new Map<string, { debit: number; credit: number }>();
    for (const l of lines) {
      if (!totalsMap.has(l.accountId)) {
        totalsMap.set(l.accountId, { debit: 0, credit: 0 });
      }
      const t = totalsMap.get(l.accountId)!;
      t.debit += l.debit;
      t.credit += l.credit;
    }

    let sumTotalDebit = 0;
    let sumTotalCredit = 0;
    let sumNetDebit = 0;
    let sumNetCredit = 0;

    const rows = accounts.map(acc => {
      const t = totalsMap.get(acc.id) || { debit: 0, credit: 0 };
      const d = Math.round(t.debit * 100) / 100;
      const c = Math.round(t.credit * 100) / 100;

      // Net balance
      let netDebit = 0;
      let netCredit = 0;
      if (d > c) {
        netDebit = Math.round((d - c) * 100) / 100;
      } else {
        netCredit = Math.round((c - d) * 100) / 100;
      }

      sumTotalDebit += d;
      sumTotalCredit += c;
      sumNetDebit += netDebit;
      sumNetCredit += netCredit;

      return {
        id: acc.id,
        code: acc.code,
        nameEn: acc.nameEn,
        nameAr: acc.nameAr,
        type: acc.type,
        category: acc.category,
        totalDebit: d,
        totalCredit: c,
        netDebit,
        netCredit,
      };
    }).filter(r => r.totalDebit > 0 || r.totalCredit > 0);

    return {
      rows,
      summary: {
        totalDebit: Math.round(sumTotalDebit * 100) / 100,
        totalCredit: Math.round(sumTotalCredit * 100) / 100,
        netDebit: Math.round(sumNetDebit * 100) / 100,
        netCredit: Math.round(sumNetCredit * 100) / 100,
        isBalanced: Math.abs(sumTotalDebit - sumTotalCredit) < 0.05,
      },
    };
  }

  /**
   * 2. PROFIT & LOSS / INCOME STATEMENT (قائمة الدخل والأرباح والخسائر)
   * Revenues - COGS = Gross Profit
   * Gross Profit - Expenses = Net Operating Profit
   */
  async getProfitAndLoss(orgId: string, { branchId, startDate, endDate }: any) {
    const tb = await this.getTrialBalance(orgId, { branchId, startDate, endDate });

    const revenues: any[] = [];
    const cogs: any[] = [];
    const expenses: any[] = [];

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalExpenses = 0;

    for (const row of tb.rows) {
      if (row.type === 'REVENUE') {
        const amt = row.category === 'SALES_DISCOUNT' ? -row.netDebit : (row.netCredit - row.netDebit);
        totalRevenue += amt;
        revenues.push({ ...row, amount: amt });
      } else if (row.type === 'EXPENSE' && (row.category === 'COGS' || row.code.startsWith('5'))) {
        const amt = row.category === 'PURCHASE_DISCOUNT' ? -row.netCredit : (row.netDebit - row.netCredit);
        totalCogs += amt;
        cogs.push({ ...row, amount: amt });
      } else if (row.type === 'EXPENSE') {
        const amt = row.netDebit - row.netCredit;
        totalExpenses += amt;
        expenses.push({ ...row, amount: amt });
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      period: { startDate, endDate, branchId },
      revenues,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      cogs,
      totalCogs: Math.round(totalCogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      expenses,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
    };
  }

  /**
   * 3. BALANCE SHEET (الميزانية العمومية)
   * Assets = Liabilities + Equity + (Net Profit of current period)
   */
  async getBalanceSheet(orgId: string, { branchId, asOfDate }: any) {
    const tb = await this.getTrialBalance(orgId, { branchId, endDate: asOfDate });
    const pnl = await this.getProfitAndLoss(orgId, { branchId, endDate: asOfDate });

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const row of tb.rows) {
      if (row.type === 'ASSET') {
        const amt = row.category === 'ACCUMULATED_DEPRECIATION'
          ? -(row.netCredit)
          : (row.netDebit - row.netCredit);
        totalAssets += amt;
        assets.push({ ...row, amount: amt });
      } else if (row.type === 'LIABILITY') {
        const amt = row.netCredit - row.netDebit;
        totalLiabilities += amt;
        liabilities.push({ ...row, amount: amt });
      } else if (row.type === 'EQUITY') {
        const amt = row.netCredit - row.netDebit;
        totalEquity += amt;
        equity.push({ ...row, amount: amt });
      }
    }

    // Add current period net profit into equity
    const currentPeriodNetProfit = pnl.netProfit;
    const grandEquity = totalEquity + currentPeriodNetProfit;
    const totalLiabilitiesAndEquity = totalLiabilities + grandEquity;

    return {
      asOfDate: asOfDate || new Date().toISOString(),
      assets,
      totalAssets: Math.round(totalAssets * 100) / 100,
      liabilities,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      equity,
      totalEquity: Math.round(totalEquity * 100) / 100,
      currentPeriodNetProfit: Math.round(currentPeriodNetProfit * 100) / 100,
      grandEquity: Math.round(grandEquity * 100) / 100,
      totalLiabilitiesAndEquity: Math.round(totalLiabilitiesAndEquity * 100) / 100,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1.0,
    };
  }

  /**
   * 4. CASH FLOW STATEMENT (قائمة التدفقات النقدية)
   */
  async getCashFlow(orgId: string, { branchId, startDate, endDate }: any) {
    const where: any = {
      journalEntry: {
        organizationId: orgId,
        status: { in: ['POSTED', 'REVERSED'] },
      },
      account: {
        category: { in: ['CASH', 'BANK'] },
      },
    };

    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.journalEntry.entryDate = {};
      if (startDate) where.journalEntry.entryDate.gte = new Date(startDate);
      if (endDate) where.journalEntry.entryDate.lte = new Date(endDate);
    }

    const cashLines = await prisma.journalEntryLine.findMany({
      where,
      include: {
        journalEntry: true,
        account: true,
      },
      orderBy: { journalEntry: { entryDate: 'asc' } },
    });

    let operatingInflow = 0;
    let operatingOutflow = 0;
    const flows: any[] = [];

    for (const l of cashLines) {
      const netChange = l.debit - l.credit;
      if (netChange > 0) operatingInflow += netChange;
      else operatingOutflow += Math.abs(netChange);

      flows.push({
        date: l.journalEntry.entryDate,
        entryNumber: l.journalEntry.entryNumber,
        sourceType: l.journalEntry.sourceType,
        sourceNumber: l.journalEntry.sourceNumber,
        description: l.description || l.journalEntry.narration,
        accountName: l.account.nameAr || l.account.nameEn,
        inflow: l.debit > 0 ? l.debit : 0,
        outflow: l.credit > 0 ? l.credit : 0,
        net: netChange,
      });
    }

    const netChangeInCash = operatingInflow - operatingOutflow;

    return {
      flows,
      summary: {
        totalInflow: Math.round(operatingInflow * 100) / 100,
        totalOutflow: Math.round(operatingOutflow * 100) / 100,
        netChangeInCash: Math.round(netChangeInCash * 100) / 100,
      },
    };
  }

  /**
   * 5. PERIOD CONTROLS (الفترات والسنوات المالية)
   */
  async listFiscalYears(orgId: string) {
    await this.initializeOrganizationAccounts(orgId);
    return prisma.fiscalYear.findMany({
      where: { organizationId: orgId },
      include: { periods: { orderBy: { periodNumber: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async closeAccountingPeriod(periodId: string, userId: string) {
    const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new AppError('Period not found', 404);
    if (period.isClosed) throw new AppError('Period already closed', 400);

    return prisma.accountingPeriod.update({
      where: { id: periodId },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedById: userId,
      },
    });
  }

  async reopenAccountingPeriod(periodId: string) {
    const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new AppError('Period not found', 404);

    return prisma.accountingPeriod.update({
      where: { id: periodId },
      data: {
        isClosed: false,
        closedAt: null,
        closedById: null,
      },
    });
  }

  /**
   * 6. GRANULAR PROFITABILITY ENGINE (حساب دقيق جداً للأرباح)
   * Multi-level Profit Breakdown:
   * 1. Vehicles Sold (VIN-level exact purchaseCost vs sellingPrice)
   * 2. Spare Parts & Catalog Products (Line-item unitCost vs unitPrice)
   * 3. Workshop & Maintenance Jobs (Labor pure profit + Parts margin)
   * 4. Operating Expenses & Deductions (Rent, Utilities, Fuel, Payroll)
   * 5. Final Net Profit & Margin Percentages
   */
  async getDetailedProfitability(orgId: string, { branchId, startDate, endDate }: any) {
    const invoiceWhere: any = {
      organizationId: orgId,
      status: 'COMPLETED',
    };
    if (branchId) invoiceWhere.branchId = branchId;
    if (startDate || endDate) {
      invoiceWhere.invoiceDate = {};
      if (startDate) invoiceWhere.invoiceDate.gte = new Date(startDate);
      if (endDate) invoiceWhere.invoiceDate.lte = new Date(endDate);
    }

    // 1. Fetch all completed sales invoices with detailed line items & vehicle units
    const invoices = await prisma.salesInvoice.findMany({
      where: invoiceWhere,
      include: {
        branch: { select: { id: true, nameAr: true, nameEn: true } },
        customer: { select: { id: true, nameAr: true, nameEn: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, type: true, sku: true, costPrice: true } },
            vehicleUnit: {
              select: {
                id: true,
                vin: true,
                engineNumber: true,
                color: true,
                modelYear: true,
                purchaseCost: true,
                sellingPrice: true,
                model: { select: { nameAr: true, nameEn: true } },
              },
            },
          },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    let vehicleRevenue = 0;
    let vehicleCost = 0;
    const vehicleProfits: any[] = [];

    let partsRevenue = 0;
    let partsCost = 0;
    const productProfitsMap = new Map<string, any>();

    for (const inv of invoices) {
      for (const item of inv.items) {
        const itemRev = item.totalPrice; // Price after line discount + taxes

        // A. If line is a Vehicle (Specific Chassis / VIN)
        if (item.vehicleUnit || item.product?.type === 'VEHICLE') {
          // Exact unit cost priority: vehicleUnit.purchaseCost > item.unitCost > product.costPrice
          const actualCost = item.vehicleUnit?.purchaseCost || (item.unitCost > 0 ? item.unitCost : (item.product?.costPrice || 0));
          const profit = itemRev - actualCost;
          const marginPct = itemRev > 0 ? (profit / itemRev) * 100 : 0;

          vehicleRevenue += itemRev;
          vehicleCost += actualCost;

          vehicleProfits.push({
            invoiceNumber: inv.invoiceNo,
            invoiceDate: inv.invoiceDate,
            branchName: inv.branch?.nameAr || inv.branch?.nameEn || 'فرع',
            customerName: inv.customer?.nameAr || inv.customer?.nameEn || 'عميل',
            productName: item.product?.nameAr || item.product?.nameEn || 'مركبة',
            vin: item.vehicleUnit?.vin || 'غير محدد',
            engineNumber: item.vehicleUnit?.engineNumber || '-',
            color: item.vehicleUnit?.color || '-',
            modelYear: item.vehicleUnit?.modelYear || '-',
            modelName: item.vehicleUnit?.model?.nameAr || item.vehicleUnit?.model?.nameEn || '-',
            sellingPrice: itemRev,
            purchaseCost: actualCost,
            grossProfit: Math.round(profit * 100) / 100,
            marginPct: Math.round(marginPct * 100) / 100,
          });
        } 
        // B. Spare Parts & Other Merchandise
        else if (item.product?.type !== 'SERVICE') {
          // Actual unit cost recorded at sale or standard weighted cost
          const actualUnitCost = item.unitCost > 0 ? item.unitCost : (item.product?.costPrice || 0);
          const totalCostForItem = actualUnitCost * item.quantity;
          const profit = itemRev - totalCostForItem;

          partsRevenue += itemRev;
          partsCost += totalCostForItem;

          const prodKey = item.productId;
          if (!productProfitsMap.has(prodKey)) {
            productProfitsMap.set(prodKey, {
              productId: item.productId,
              sku: item.product?.sku || '-',
              name: item.product?.nameAr || item.product?.nameEn || 'قطعة غيار',
              type: item.product?.type || 'SPARE_PART',
              totalQuantitySold: 0,
              totalRevenue: 0,
              totalCost: 0,
              grossProfit: 0,
              marginPct: 0,
            });
          }
          const rec = productProfitsMap.get(prodKey);
          rec.totalQuantitySold += item.quantity;
          rec.totalRevenue += itemRev;
          rec.totalCost += totalCostForItem;
          rec.grossProfit = rec.totalRevenue - rec.totalCost;
          rec.marginPct = rec.totalRevenue > 0 ? (rec.grossProfit / rec.totalRevenue) * 100 : 0;
        }
      }
    }

    const productProfits = Array.from(productProfitsMap.values()).map(p => ({
      ...p,
      totalRevenue: Math.round(p.totalRevenue * 100) / 100,
      totalCost: Math.round(p.totalCost * 100) / 100,
      grossProfit: Math.round(p.grossProfit * 100) / 100,
      marginPct: Math.round(p.marginPct * 10) / 10,
    })).sort((a, b) => b.grossProfit - a.grossProfit);

    // 2. Fetch Workshop Work Orders (Service & Labor vs Installed Parts)
    const workOrderWhere: any = {
      organizationId: orgId,
      status: { in: ['COMPLETED', 'DELIVERED', 'INVOICED'] },
    };
    if (branchId) workOrderWhere.branchId = branchId;
    if (startDate || endDate) {
      workOrderWhere.createdAt = {};
      if (startDate) workOrderWhere.createdAt.gte = new Date(startDate);
      if (endDate) workOrderWhere.createdAt.lte = new Date(endDate);
    }

    const workOrders = await prisma.workOrder.findMany({
      where: workOrderWhere,
      include: {
        branch: { select: { id: true, nameAr: true, nameEn: true } },
        customer: { select: { id: true, nameAr: true, nameEn: true } },
        vehicleUnit: { select: { vin: true } },
        items: {
          include: {
            product: { select: { id: true, nameAr: true, nameEn: true, type: true, costPrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let workshopLaborRevenue = 0;
    let workshopPartsRevenue = 0;
    let workshopPartsCost = 0;
    const workshopJobProfits: any[] = [];

    for (const wo of workOrders) {
      let woLaborRev = 0;
      let woPartsRev = 0;
      let woPartsCost = 0;

      for (const item of wo.items) {
        if (item.product?.type === 'SERVICE') {
          // Labor has 0 direct material cost -> 100% gross margin
          woLaborRev += item.totalPrice;
        } else {
          // Consumed replacement part in maintenance
          const cost = (item.product?.costPrice || 0) * item.quantity;
          woPartsRev += item.totalPrice;
          woPartsCost += cost;
        }
      }

      const totalOrderRev = woLaborRev + woPartsRev;
      const totalOrderCost = woPartsCost;
      const orderProfit = totalOrderRev - totalOrderCost;
      const orderMarginPct = totalOrderRev > 0 ? (orderProfit / totalOrderRev) * 100 : 0;

      workshopLaborRevenue += woLaborRev;
      workshopPartsRevenue += woPartsRev;
      workshopPartsCost += woPartsCost;

      workshopJobProfits.push({
        orderNumber: wo.orderNumber,
        date: wo.createdAt,
        branchName: wo.branch?.nameAr || wo.branch?.nameEn || 'فرع',
        customerName: wo.customer?.nameAr || wo.customer?.nameEn || 'عميل',
        vin: wo.vehicleUnit?.vin || '-',
        laborRevenue: Math.round(woLaborRev * 100) / 100,
        partsRevenue: Math.round(woPartsRev * 100) / 100,
        partsCost: Math.round(woPartsCost * 100) / 100,
        totalRevenue: Math.round(totalOrderRev * 100) / 100,
        totalCost: Math.round(totalOrderCost * 100) / 100,
        grossProfit: Math.round(orderProfit * 100) / 100,
        marginPct: Math.round(orderMarginPct * 10) / 10,
      });
    }

    // 3. Operating Expenses Deductions (مصروفات التشغيل المباشرة وغير المباشرة)
    const expenseWhere: any = {
      organizationId: orgId,
    };
    if (branchId) expenseWhere.branchId = branchId;
    if (startDate || endDate) {
      expenseWhere.expenseDate = {};
      if (startDate) expenseWhere.expenseDate.gte = new Date(startDate);
      if (endDate) expenseWhere.expenseDate.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        category: true,
        description: true,
        amount: true,
        expenseDate: true,
      },
    });

    let totalOperatingExpenses = 0;
    const expenseBreakdownMap = new Map<string, number>();
    for (const exp of expenses) {
      totalOperatingExpenses += exp.amount;
      const cat = exp.category || 'عام';
      expenseBreakdownMap.set(cat, (expenseBreakdownMap.get(cat) || 0) + exp.amount);
    }

    // 4. Payroll Expenses Deductions (رواتب الموظفين)
    const payrollWhere: any = {
      organizationId: orgId,
      status: { in: ['APPROVED', 'PAID'] },
    };
    if (branchId) payrollWhere.branchId = branchId;
    if (startDate || endDate) {
      payrollWhere.issueDate = {};
      if (startDate) payrollWhere.issueDate.gte = new Date(startDate);
      if (endDate) payrollWhere.issueDate.lte = new Date(endDate);
    }

    const payrolls = await prisma.payroll.findMany({
      where: payrollWhere,
      select: { totalNet: true },
    });
    const totalPayrollExpenses = payrolls.reduce((sum, p) => sum + p.totalNet, 0);

    // 5. Comprehensive Summary Aggregates
    const totalRevenue = vehicleRevenue + partsRevenue + workshopLaborRevenue + workshopPartsRevenue;
    const totalCOGS = vehicleCost + partsCost + workshopPartsCost;
    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const totalOverhead = totalOperatingExpenses + totalPayrollExpenses;
    const netProfit = grossProfit - totalOverhead;
    const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMarginPct: Math.round(grossMarginPct * 10) / 10,
        totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
        totalPayrollExpenses: Math.round(totalPayrollExpenses * 100) / 100,
        totalOverhead: Math.round(totalOverhead * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        netMarginPct: Math.round(netMarginPct * 10) / 10,
        breakdown: {
          vehicles: {
            revenue: Math.round(vehicleRevenue * 100) / 100,
            cost: Math.round(vehicleCost * 100) / 100,
            profit: Math.round((vehicleRevenue - vehicleCost) * 100) / 100,
            marginPct: vehicleRevenue > 0 ? Math.round(((vehicleRevenue - vehicleCost) / vehicleRevenue) * 1000) / 10 : 0,
            count: vehicleProfits.length,
          },
          spareParts: {
            revenue: Math.round(partsRevenue * 100) / 100,
            cost: Math.round(partsCost * 100) / 100,
            profit: Math.round((partsRevenue - partsCost) * 100) / 100,
            marginPct: partsRevenue > 0 ? Math.round(((partsRevenue - partsCost) / partsRevenue) * 1000) / 10 : 0,
            count: productProfits.length,
          },
          workshop: {
            laborRevenue: Math.round(workshopLaborRevenue * 100) / 100,
            partsRevenue: Math.round(workshopPartsRevenue * 100) / 100,
            partsCost: Math.round(workshopPartsCost * 100) / 100,
            profit: Math.round((workshopLaborRevenue + (workshopPartsRevenue - workshopPartsCost)) * 100) / 100,
            marginPct: (workshopLaborRevenue + workshopPartsRevenue) > 0 
              ? Math.round(((workshopLaborRevenue + workshopPartsRevenue - workshopPartsCost) / (workshopLaborRevenue + workshopPartsRevenue)) * 1000) / 10 
              : 0,
            count: workshopJobProfits.length,
          },
          expensesByCategory: Array.from(expenseBreakdownMap.entries()).map(([category, amount]) => ({
            category,
            amount: Math.round(amount * 100) / 100,
          })),
        },
      },
      vehicles: vehicleProfits,
      products: productProfits,
      workshopJobs: workshopJobProfits,
    };
  }
}
