import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class PurchasingService {
  // ==========================================
  // 1. SUPPLIER CATEGORIES
  // ==========================================
  async listSupplierCategories(orgId: string) {
    return prisma.supplierCategory.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { suppliers: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupplierCategory(orgId: string, data: any) {
    const code = (data.code || `CAT-${Date.now()}`).toUpperCase().trim();
    const existing = await prisma.supplierCategory.findUnique({
      where: { organizationId_code: { organizationId: orgId, code } },
    });
    if (existing) throw new AppError('Category code already exists', 400);

    return prisma.supplierCategory.create({
      data: {
        organizationId: orgId,
        code,
        nameEn: data.nameEn || data.nameAr,
        nameAr: data.nameAr || data.nameEn,
        description: data.description || null,
      },
    });
  }

  // ==========================================
  // 2. SUPPLIERS
  // ==========================================
  async listSuppliers(orgId: string, { skip, limit, search, categoryId, isActive }: any) {
    const where: any = { organizationId: orgId };
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
    if (search) {
      where.OR = [
        { supplierCode: { contains: search } },
        { nameEn: { contains: search } },
        { nameAr: { contains: search } },
        { phone: { contains: search } },
        { contactPerson: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          _count: {
            select: {
              purchaseOrders: true,
              goodsReceipts: true,
              purchaseInvoices: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async getSupplierById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        category: true,
        purchaseOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { branch: true },
        },
        purchaseInvoices: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { branch: true },
        },
        payments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!supplier) throw new AppError('Supplier not found', 404);
    return supplier;
  }

  async createSupplier(orgId: string, data: any, userId: string) {
    const supplierCode = (data.supplierCode || `SUP-${Math.floor(1000 + Math.random() * 9000)}`).trim();
    const existing = await prisma.supplier.findUnique({
      where: { organizationId_supplierCode: { organizationId: orgId, supplierCode } },
    });
    if (existing) throw new AppError('Supplier code already exists', 400);

    const supplier = await prisma.supplier.create({
      data: {
        organizationId: orgId,
        supplierCode,
        nameAr: data.nameAr || data.nameEn,
        nameEn: data.nameEn || data.nameAr,
        categoryId: data.categoryId || null,
        contactPerson: data.contactPerson || null,
        phone: data.phone || '',
        email: data.email || null,
        taxNumber: data.taxNumber || null,
        commercialReg: data.commercialReg || null,
        address: data.address || null,
        city: data.city || 'Cairo',
        country: data.country || 'Egypt',
        paymentTerms: data.paymentTerms || 'NET_30',
        creditLimit: Number(data.creditLimit || 0),
        notes: data.notes || null,
      },
      include: { category: true },
    });

    createAuditLog({
      userId,
      entityType: 'Supplier',
      entityId: supplier.id,
      action: 'create',
      afterData: supplier,
    });

    return supplier;
  }

  async updateSupplier(id: string, data: any, userId: string) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new AppError('Supplier not found', 404);

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        nameAr: data.nameAr !== undefined ? data.nameAr : existing.nameAr,
        nameEn: data.nameEn !== undefined ? data.nameEn : existing.nameEn,
        categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
        contactPerson: data.contactPerson !== undefined ? data.contactPerson : existing.contactPerson,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        email: data.email !== undefined ? data.email : existing.email,
        taxNumber: data.taxNumber !== undefined ? data.taxNumber : existing.taxNumber,
        commercialReg: data.commercialReg !== undefined ? data.commercialReg : existing.commercialReg,
        address: data.address !== undefined ? data.address : existing.address,
        city: data.city !== undefined ? data.city : existing.city,
        paymentTerms: data.paymentTerms !== undefined ? data.paymentTerms : existing.paymentTerms,
        creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : existing.creditLimit,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
      include: { category: true },
    });

    createAuditLog({
      userId,
      entityType: 'Supplier',
      entityId: id,
      action: 'update',
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  async getSupplierStatement(id: string, { startDate, endDate }: any) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new AppError('Supplier not found', 404);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [invoices, payments, returns] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where: {
          supplierId: id,
          ...(startDate || endDate ? { invoiceDate: dateFilter } : {}),
        },
        orderBy: { invoiceDate: 'asc' },
        include: { branch: true },
      }),
      prisma.supplierPayment.findMany({
        where: {
          supplierId: id,
          ...(startDate || endDate ? { paymentDate: dateFilter } : {}),
        },
        orderBy: { paymentDate: 'asc' },
      }),
      prisma.purchaseReturn.findMany({
        where: {
          supplierId: id,
          ...(startDate || endDate ? { returnDate: dateFilter } : {}),
        },
        orderBy: { returnDate: 'asc' },
      }),
    ]);

    // Build unified running ledger
    const transactions: any[] = [];

    invoices.forEach((inv) => {
      transactions.push({
        id: inv.id,
        date: inv.invoiceDate,
        type: 'INVOICE',
        referenceNo: inv.invoiceNo,
        description: `فاتورة شراء رقم ${inv.invoiceNo} (مورد: ${inv.supplierInvoiceNo || '—'})`,
        debit: 0,
        credit: inv.grandTotal, // We owe supplier
      });
    });

    payments.forEach((pay) => {
      transactions.push({
        id: pay.id,
        date: pay.paymentDate,
        type: 'PAYMENT',
        referenceNo: pay.paymentNo,
        description: `دفعة للمورد رقم ${pay.paymentNo} (${pay.paymentMethod})`,
        debit: pay.amount, // Paid to supplier (reduces debt)
        credit: 0,
      });
    });

    returns.forEach((ret) => {
      transactions.push({
        id: ret.id,
        date: ret.returnDate,
        type: 'RETURN',
        referenceNo: ret.returnNo,
        description: `مرتجع مشتريات رقم ${ret.returnNo}`,
        debit: ret.grandTotal, // Return reduces debt
        credit: 0,
      });
    });

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledger = transactions.map((t) => {
      runningBalance += (t.credit - t.debit);
      return {
        ...t,
        balance: runningBalance,
      };
    });

    return {
      supplier,
      statement: ledger,
      currentBalance: supplier.currentBalance,
      totalPurchases: invoices.reduce((sum, i) => sum + i.grandTotal, 0),
      totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
      totalReturns: returns.reduce((sum, r) => sum + r.grandTotal, 0),
    };
  }

  // ==========================================
  // 3. PURCHASE QUOTATIONS
  // ==========================================
  async listPurchaseQuotations(orgId: string, { skip, limit, branchId, supplierId, status, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { quotationNo: { contains: search } },
        { supplier: { nameAr: { contains: search } } },
        { supplier: { nameEn: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.purchaseQuotation.count({ where }),
      prisma.purchaseQuotation.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: true,
          branch: true,
          items: { include: { product: true } },
          createdBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async createPurchaseQuotation(orgId: string, data: any, userId: string) {
    const quotationNo = `PQ-${Date.now()}`;
    let subtotal = 0;
    let taxAmount = 0;

    const items = (data.items || []).map((it: any) => {
      const qty = Number(it.quantity) || 1;
      const unitCost = Number(it.unitCost) || 0;
      const disc = Number(it.discount) || 0;
      const rate = Number(it.taxRate !== undefined ? it.taxRate : 14);
      const taxable = Math.max(0, (qty * unitCost) - disc);
      const tax = (taxable * rate) / 100;
      const totalCost = taxable + tax;

      subtotal += (qty * unitCost);
      taxAmount += tax;

      return {
        productId: it.productId,
        description: it.description || null,
        quantity: qty,
        unitCost,
        discount: disc,
        taxRate: rate,
        taxAmount: tax,
        totalCost,
      };
    });

    const discountTotal = Number(data.discountTotal) || 0;
    const grandTotal = Math.max(0, subtotal - discountTotal) + taxAmount;

    return prisma.purchaseQuotation.create({
      data: {
        quotationNo,
        organizationId: orgId,
        branchId: data.branchId,
        supplierId: data.supplierId,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        subtotal,
        discountTotal,
        taxRate: Number(data.taxRate || 14),
        taxAmount,
        grandTotal,
        notes: data.notes || null,
        createdById: userId,
        items: { create: items },
      },
      include: { items: { include: { product: true } }, supplier: true },
    });
  }

  // ==========================================
  // 4. PURCHASE ORDERS
  // ==========================================
  async listPurchaseOrders(orgId: string, { skip, limit, branchId, supplierId, status, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { supplier: { nameAr: { contains: search } } },
        { supplier: { nameEn: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: true,
          branch: true,
          items: { include: { product: true } },
          createdBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
          goodsReceipts: { select: { id: true, receiptNo: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async createPurchaseOrder(orgId: string, data: any, userId: string) {
    const orderNo = `PO-${Date.now()}`;
    let subtotal = 0;
    let taxAmount = 0;

    const items = (data.items || []).map((it: any) => {
      const qty = Number(it.quantity) || 1;
      const unitCost = Number(it.unitCost) || 0;
      const disc = Number(it.discount) || 0;
      const rate = it.taxRate !== undefined ? Number(it.taxRate) : (data.taxRate !== undefined ? Number(data.taxRate) : 14);
      const taxable = Math.max(0, (qty * unitCost) - disc);
      const tax = (taxable * rate) / 100;
      const totalCost = taxable + tax;

      subtotal += (qty * unitCost);
      taxAmount += tax;

      return {
        productId: it.productId,
        description: it.description || null,
        quantity: qty,
        unitCost,
        discount: disc,
        taxRate: rate,
        taxAmount: tax,
        totalCost,
      };
    });

    const discountTotal = Number(data.discountTotal) || 0;
    const grandTotal = Math.max(0, subtotal - discountTotal) + taxAmount;

    return prisma.purchaseOrder.create({
      data: {
        orderNo,
        organizationId: orgId,
        branchId: data.branchId,
        supplierId: data.supplierId,
        quotationId: data.quotationId || null,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        subtotal,
        discountTotal,
        taxRate: data.taxRate !== undefined ? Number(data.taxRate) : 14,
        taxAmount,
        grandTotal,
        notes: data.notes || null,
        createdById: userId,
        items: { create: items },
      },
      include: { items: { include: { product: true } }, supplier: true },
    });
  }

  // ==========================================
  // 5. GOODS RECEIPT (INVENTORY IN + VEHICLES)
  // ==========================================
  async listGoodsReceipts(orgId: string, { skip, limit, branchId, warehouseId, supplierId, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { receiptNo: { contains: search } },
        { supplier: { nameAr: { contains: search } } },
        { supplier: { nameEn: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.goodsReceipt.count({ where }),
      prisma.goodsReceipt.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: true,
          branch: true,
          warehouse: true,
          purchaseOrder: true,
          items: {
            include: {
              product: true,
              vehicleUnit: { include: { model: true } },
            },
          },
          receivedBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
          purchaseInvoice: { select: { id: true, invoiceNo: true, grandTotal: true, paymentStatus: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  /**
   * Goods Receipt Creation:
   * 1. Validates unique VIN & Engine Numbers across all VehicleUnits
   * 2. Creates VehicleUnit records for vehicles with status 'AVAILABLE' and cost
   * 3. Increments StockBalance for parts and oils
   * 4. Updates Product costPrice with weighted average/last purchase cost
   * 5. Creates StockMovement records (type: 'PURCHASE')
   * 6. Updates PurchaseOrder status to RECEIVED/PARTIALLY_RECEIVED
   */
  async createGoodsReceipt(orgId: string, data: any, userId: string) {
    const receiptNo = `GR-${Date.now()}`;

    // Validate duplicate VIN/Engine in the current payload
    const vinsInPayload = new Set<string>();
    const enginesInPayload = new Set<string>();

    for (const item of (data.items || [])) {
      if (item.vin) {
        const v = item.vin.trim().toUpperCase();
        if (vinsInPayload.has(v)) {
          throw new AppError(`رقم الشاسيه مكرر في نفس إذن الاستلام: ${v}`, 400);
        }
        vinsInPayload.add(v);
      }
      if (item.engineNumber) {
        const e = item.engineNumber.trim().toUpperCase();
        if (enginesInPayload.has(e)) {
          throw new AppError(`رقم المحرك مكرر في نفس إذن الاستلام: ${e}`, 400);
        }
        enginesInPayload.add(e);
      }
    }

    // Check database for existing duplicate VIN or Engine numbers
    if (vinsInPayload.size > 0) {
      const existingVin = await prisma.vehicleUnit.findFirst({
        where: { vin: { in: Array.from(vinsInPayload) } },
      });
      if (existingVin) {
        throw new AppError(`رقم الشاسيه (VIN) مسجل بالفعل في النظام: ${existingVin.vin}`, 400);
      }
    }

    if (enginesInPayload.size > 0) {
      const existingEngine = await prisma.vehicleUnit.findFirst({
        where: { engineNumber: { in: Array.from(enginesInPayload) } },
      });
      if (existingEngine) {
        throw new AppError(`رقم المحرك مسجل بالفعل في النظام: ${existingEngine.engineNumber}`, 400);
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create Goods Receipt Header
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNo,
          organizationId: orgId,
          branchId: data.branchId,
          warehouseId: data.warehouseId,
          supplierId: data.supplierId,
          purchaseOrderId: data.purchaseOrderId || null,
          notes: data.notes || null,
          receivedById: userId,
        },
      });

      // 2. Process each received item
      for (const item of (data.items || [])) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) throw new AppError('Product not found in receipt item', 400);

        const qty = Number(item.quantity) || 1;
        const unitCost = Number(item.unitCost) || prod.costPrice || 0;
        const totalCost = qty * unitCost;

        let createdVehicleUnitId: string | null = null;

        // If it's a vehicle or has VIN/engine details, create VehicleUnit
        if (prod.type === 'VEHICLE' || item.vin) {
          if (!item.vin || !item.engineNumber) {
            throw new AppError(`المركبة (${prod.nameAr || prod.nameEn}) تتطلب إدخال رقم الشاسيه (VIN) ورقم الموتور`, 400);
          }

          const veh = await tx.vehicleUnit.create({
            data: {
              productId: prod.id,
              modelId: item.modelId || prod.vehicleModelId || null,
              branchId: data.branchId,
              warehouseId: data.warehouseId,
              vin: item.vin.trim().toUpperCase(),
              engineNumber: item.engineNumber.trim().toUpperCase(),
              color: item.color || 'أبيض',
              modelYear: Number(item.modelYear) || new Date().getFullYear(),
              status: 'AVAILABLE',
              purchaseCost: unitCost,
              sellingPrice: prod.retailPrice || 0,
              b2bPrice: prod.b2bPrice || 0,
              mileage: 0,
              notes: item.notes || `Received via GR ${receiptNo}`,
            },
          });
          createdVehicleUnitId = veh.id;
        }

        // 3. Create GoodsReceiptItem record
        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: receipt.id,
            productId: item.productId,
            vehicleUnitId: createdVehicleUnitId,
            quantity: qty,
            unitCost,
            totalCost,
            vin: item.vin ? item.vin.trim().toUpperCase() : null,
            engineNumber: item.engineNumber ? item.engineNumber.trim().toUpperCase() : null,
            color: item.color || null,
            batchNumber: item.batchNumber || null,
            notes: item.notes || null,
          },
        });

        // 4. Inventory Stock Increment & Cost Update for Physical Items
        if (prod.type !== 'SERVICE') {
          // Upsert StockBalance
          const existingBalance = await tx.stockBalance.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: data.warehouseId,
                productId: item.productId,
              },
            },
          });

          const oldQty = existingBalance ? existingBalance.quantity : 0;
          const oldAvg = existingBalance ? existingBalance.avgCost : 0;
          const newQty = oldQty + qty;
          const newAvgCost = newQty > 0 ? ((oldQty * oldAvg) + (qty * unitCost)) / newQty : unitCost;

          await tx.stockBalance.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: data.warehouseId,
                productId: item.productId,
              },
            },
            update: {
              quantity: { increment: qty },
              availableQty: { increment: qty },
              avgCost: newAvgCost,
            },
            create: {
              warehouseId: data.warehouseId,
              productId: item.productId,
              quantity: qty,
              availableQty: qty,
              avgCost: unitCost,
            },
          });

          // Update Product master cost price
          await tx.product.update({
            where: { id: item.productId },
            data: { costPrice: unitCost },
          });

          // Record Stock Movement
          await tx.stockMovement.create({
            data: {
              movementNumber: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              movementType: 'PURCHASE_IN',
              branchId: data.branchId,
              warehouseId: data.warehouseId,
              productId: item.productId,
              vehicleUnitId: createdVehicleUnitId,
              quantity: qty,
              unitCost,
              totalCost,
              beforeQuantity: oldQty,
              afterQuantity: newQty,
              referenceType: 'GOODS_RECEIPT',
              referenceNumber: receiptNo,
              referenceId: receipt.id,
              notes: `إذن استلام بضاعة واردة ${receiptNo}`,
              createdById: userId,
            },
          });
        }

        // 5. Update receivedQuantity on PurchaseOrderItem if linked
        if (data.purchaseOrderId) {
          const poItem = await tx.purchaseOrderItem.findFirst({
            where: { orderId: data.purchaseOrderId, productId: item.productId },
          });
          if (poItem) {
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: { receivedQuantity: { increment: qty } },
            });
          }
        }
      }

      // 6. Update Purchase Order status if linked
      if (data.purchaseOrderId) {
        const remainingItems = await tx.purchaseOrderItem.findMany({
          where: { orderId: data.purchaseOrderId },
        });
        const allReceived = remainingItems.every((it) => it.receivedQuantity >= it.quantity);
        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: { status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
        });
      }

      return receipt;
    });
  }

  // ==========================================
  // 6. PURCHASE INVOICES (ACCOUNTS PAYABLE)
  // ==========================================
  async listPurchaseInvoices(orgId: string, { skip, limit, branchId, warehouseId, supplierId, paymentStatus, search, startDate, endDate }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (supplierId) where.supplierId = supplierId;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { supplierInvoiceNo: { contains: search } },
        { supplier: { nameAr: { contains: search } } },
        { supplier: { nameEn: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.purchaseInvoice.count({ where }),
      prisma.purchaseInvoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: true,
          branch: true,
          warehouse: true,
          goodsReceipt: true,
          purchaseOrder: true,
          items: { include: { product: true } },
          payments: true,
          createdBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
        },
        orderBy: { invoiceDate: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async createPurchaseInvoice(orgId: string, data: any, userId: string) {
    const invoiceNo = `PINV-${Date.now()}`;

    return prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxAmount = 0;

      const items = (data.items || []).map((it: any) => {
        const qty = Number(it.quantity) || 1;
        const unitCost = Number(it.unitCost) || 0;
        const disc = Number(it.discount) || 0;
        const rate = it.taxRate !== undefined ? Number(it.taxRate) : (data.taxRate !== undefined ? Number(data.taxRate) : 14);
        const taxable = Math.max(0, (qty * unitCost) - disc);
        const tax = (taxable * rate) / 100;
        const totalCost = taxable + tax;

        subtotal += (qty * unitCost);
        taxAmount += tax;

        return {
          productId: it.productId,
          description: it.description || null,
          quantity: qty,
          unitCost,
          discount: disc,
          taxRate: rate,
          taxAmount: tax,
          totalCost,
        };
      });

      const discountTotal = Number(data.discountTotal) || 0;
      const grandTotal = Math.max(0, subtotal - discountTotal) + taxAmount;
      const initialPaid = Number(data.paidAmount) || 0;
      const balanceDue = Math.max(0, grandTotal - initialPaid);
      const paymentStatus = balanceDue <= 0 ? 'PAID' : initialPaid > 0 ? 'PARTIAL' : 'UNPAID';

      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNo,
          supplierInvoiceNo: data.supplierInvoiceNo || null,
          organizationId: orgId,
          branchId: data.branchId,
          warehouseId: data.warehouseId,
          supplierId: data.supplierId,
          purchaseOrderId: data.purchaseOrderId || null,
          goodsReceiptId: data.goodsReceiptId || null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          subtotal,
          discountTotal,
          taxRate: data.taxRate !== undefined ? Number(data.taxRate) : 14,
          taxAmount,
          grandTotal,
          paidAmount: initialPaid,
          balanceDue,
          paymentStatus,
          notes: data.notes || null,
          createdById: userId,
          items: { create: items },
        },
        include: { supplier: true, items: true },
      });

      // Update supplier's currentBalance (we owe them the balanceDue)
      await tx.supplier.update({
        where: { id: data.supplierId },
        data: { currentBalance: { increment: balanceDue } },
      });

      // Update Inventory & Stock Balances if invoice is created directly (without prior Goods Receipt)
      if (!data.goodsReceiptId && data.warehouseId) {
        for (const item of items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (prod && prod.type !== 'SERVICE') {
            const existingBalance = await tx.stockBalance.findUnique({
              where: {
                warehouseId_productId: {
                  warehouseId: data.warehouseId,
                  productId: item.productId,
                },
              },
            });

            const oldQty = existingBalance ? existingBalance.quantity : 0;
            const oldAvg = existingBalance ? existingBalance.avgCost : 0;
            const newQty = oldQty + item.quantity;
            const newAvgCost = newQty > 0 ? ((oldQty * oldAvg) + (item.quantity * item.unitCost)) / newQty : item.unitCost;

            await tx.stockBalance.upsert({
              where: {
                warehouseId_productId: {
                  warehouseId: data.warehouseId,
                  productId: item.productId,
                },
              },
              update: {
                quantity: { increment: item.quantity },
                availableQty: { increment: item.quantity },
                avgCost: newAvgCost,
              },
              create: {
                warehouseId: data.warehouseId,
                productId: item.productId,
                quantity: item.quantity,
                availableQty: item.quantity,
                avgCost: item.unitCost,
              },
            });

            // Update master product cost price
            if (item.unitCost > 0) {
              await tx.product.update({
                where: { id: item.productId },
                data: { costPrice: item.unitCost },
              });
            }

            // Create StockMovement record
            await tx.stockMovement.create({
              data: {
                movementNumber: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                movementType: 'PURCHASE_IN',
                branchId: data.branchId,
                warehouseId: data.warehouseId,
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                totalCost: item.totalCost,
                beforeQuantity: oldQty,
                afterQuantity: newQty,
                referenceType: 'PURCHASE_INVOICE',
                referenceNumber: invoiceNo,
                notes: `مشتريات مباشرة عبر فاتورة ${invoiceNo}`,
                createdById: userId,
              },
            });
          }
        }
      }

      // If initial payment was made simultaneously
      if (initialPaid > 0) {
        await tx.supplierPayment.create({
          data: {
            paymentNo: `SPAY-${Date.now()}`,
            supplierId: data.supplierId,
            invoiceId: invoice.id,
            amount: initialPaid,
            paymentMethod: data.paymentMethod || 'CASH',
            referenceNo: data.paymentRef || null,
            notes: 'سداد فوري عند إنشاء فاتورة الشراء',
            createdById: userId,
          },
        });
      }

      // If linked to a Purchase Order, mark Purchase Order as RECEIVED (مكتمل)
      if (data.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: { status: 'RECEIVED' },
        });
        // Also update po items receivedQuantity to match full quantity
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { orderId: data.purchaseOrderId },
        });
        for (const pi of poItems) {
          await tx.purchaseOrderItem.update({
            where: { id: pi.id },
            data: { receivedQuantity: pi.quantity },
          });
        }
      }

      return invoice;
    });
  }

  async getPurchaseInvoiceById(id: string) {
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        warehouse: true,
        goodsReceipt: {
          include: {
            items: { include: { product: true, vehicleUnit: true } },
          },
        },
        purchaseOrder: true,
        items: {
          include: {
            product: { include: { brand: true, category: true } },
          },
        },
        payments: {
          include: {
            createdBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        createdBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true, email: true } },
      },
    });
    if (!invoice) throw new AppError('فاتورة الشراء غير موجودة', 404);
    return invoice;
  }

  /**
   * Update Purchase Invoice:
   * Allows updating supplier, warehouse, supplier invoice no, due date, items, discount, tax rate, notes.
   * Adjusts supplier balance and recalculates totals.
   */
  async updatePurchaseInvoice(id: string, data: any, userId: string) {
    const existing = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });
    if (!existing) throw new AppError('فاتورة الشراء غير موجودة', 404);

    return prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxAmount = 0;
      const globalTaxRate = data.taxRate !== undefined ? Number(data.taxRate) : Number(existing.taxRate || 0);

      const items = (data.items || []).map((it: any) => {
        const qty = Number(it.quantity) || 1;
        const unitCost = Number(it.unitCost) || 0;
        const disc = Number(it.discount) || 0;
        const rate = it.taxRate !== undefined ? Number(it.taxRate) : globalTaxRate;
        const taxable = Math.max(0, (qty * unitCost) - disc);
        const tax = (taxable * rate) / 100;
        const totalCost = taxable + tax;

        subtotal += (qty * unitCost);
        taxAmount += tax;

        return {
          productId: it.productId,
          description: it.description || null,
          quantity: qty,
          unitCost,
          discount: disc,
          taxRate: rate,
          taxAmount: tax,
          totalCost,
        };
      });

      const discountTotal = data.discountTotal !== undefined ? Number(data.discountTotal) : existing.discountTotal;
      const grandTotal = Math.max(0, subtotal - discountTotal) + taxAmount;
      const currentPaid = existing.paidAmount;
      const balanceDue = Math.max(0, grandTotal - currentPaid);
      const paymentStatus = balanceDue <= 0 ? 'PAID' : currentPaid > 0 ? 'PARTIAL' : 'UNPAID';

      // Reverse previous debt on existing supplier
      await tx.supplier.update({
        where: { id: existing.supplierId },
        data: { currentBalance: { decrement: existing.balanceDue } },
      });

      // Delete old items and insert updated items
      await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });

      const targetSupplierId = data.supplierId || existing.supplierId;
      const updatedInvoice = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          supplierId: targetSupplierId,
          supplierInvoiceNo: data.supplierInvoiceNo !== undefined ? data.supplierInvoiceNo : existing.supplierInvoiceNo,
          warehouseId: data.warehouseId || existing.warehouseId,
          branchId: data.branchId || existing.branchId,
          dueDate: data.dueDate ? new Date(data.dueDate) : existing.dueDate,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          subtotal,
          discountTotal,
          taxRate: globalTaxRate,
          taxAmount,
          grandTotal,
          balanceDue,
          paymentStatus,
          items: { create: items },
        },
        include: { supplier: true, items: true, payments: true },
      });

      // Apply new balanceDue to new/existing supplier
      await tx.supplier.update({
        where: { id: targetSupplierId },
        data: { currentBalance: { increment: balanceDue } },
      });

      return updatedInvoice;
    });
  }

  /**
   * Cancel/Void a Supplier Payment:
   * Reverses payment from invoice and supplier balance.
   */
  async cancelSupplierPayment(paymentId: string, userId: string) {
    const payment = await prisma.supplierPayment.findUnique({
      where: { id: paymentId },
      include: { invoice: true, supplier: true },
    });
    if (!payment) throw new AppError('عملية السداد غير موجودة', 404);

    return prisma.$transaction(async (tx) => {
      // 1. Re-add debt to supplier (we cancelled our payment to them)
      await tx.supplier.update({
        where: { id: payment.supplierId },
        data: { currentBalance: { increment: payment.amount } },
      });

      // 2. Adjust invoice if tied
      if (payment.invoiceId) {
        const inv = await tx.purchaseInvoice.findUnique({ where: { id: payment.invoiceId } });
        if (inv) {
          const newPaid = Math.max(0, inv.paidAmount - payment.amount);
          const newDue = Math.max(0, inv.grandTotal - newPaid);
          const newStatus = newDue <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';

          await tx.purchaseInvoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: newDue,
              paymentStatus: newStatus,
            },
          });
        }
      }

      // 3. Delete payment record
      await tx.supplierPayment.delete({
        where: { id: paymentId },
      });

      return { success: true, message: 'تم إلغاء عملية السداد واستعادة الرصيد بنجاح' };
    });
  }

  // ==========================================
  // 7. PURCHASE RETURNS (INVENTORY OUT + AP)
  // ==========================================
  async listPurchaseReturns(orgId: string, { skip, limit, branchId, warehouseId, supplierId, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { returnNo: { contains: search } },
        { supplier: { nameAr: { contains: search } } },
        { supplier: { nameEn: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.purchaseReturn.count({ where }),
      prisma.purchaseReturn.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: true,
          branch: true,
          warehouse: true,
          invoice: true,
          items: {
            include: {
              product: true,
              vehicleUnit: true,
            },
          },
          createdBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async createPurchaseReturn(orgId: string, data: any, userId: string) {
    const returnNo = `PRET-${Date.now()}`;

    return prisma.$transaction(async (tx) => {
      let subtotal = 0;

      for (const item of (data.items || [])) {
        subtotal += (Number(item.quantity) || 1) * (Number(item.unitCost) || 0);
      }
      const grandTotal = subtotal;

      const pReturn = await tx.purchaseReturn.create({
        data: {
          returnNo,
          organizationId: orgId,
          branchId: data.branchId,
          warehouseId: data.warehouseId,
          supplierId: data.supplierId,
          invoiceId: data.invoiceId || null,
          reason: data.reason || null,
          subtotal,
          grandTotal,
          notes: data.notes || null,
          createdById: userId,
        },
      });

      for (const item of (data.items || [])) {
        const qty = Number(item.quantity) || 1;
        const unitCost = Number(item.unitCost) || 0;
        const totalCost = qty * unitCost;

        await tx.purchaseReturnItem.create({
          data: {
            returnId: pReturn.id,
            productId: item.productId,
            vehicleUnitId: item.vehicleUnitId || null,
            quantity: qty,
            unitCost,
            totalCost,
            reason: item.reason || null,
          },
        });

        // Decrement stock balance
        await tx.stockBalance.updateMany({
          where: {
            warehouseId: data.warehouseId,
            productId: item.productId,
          },
          data: {
            quantity: { decrement: qty },
            availableQty: { decrement: qty },
          },
        });

        // If returned a vehicle, set its status to RETURNED
        if (item.vehicleUnitId) {
          await tx.vehicleUnit.update({
            where: { id: item.vehicleUnitId },
            data: { status: 'RETURNED' },
          });
        }

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            movementNumber: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            movementType: 'RETURN_OUT',
            branchId: data.branchId,
            warehouseId: data.warehouseId,
            productId: item.productId,
            vehicleUnitId: item.vehicleUnitId || null,
            quantity: -qty,
            unitCost,
            totalCost,
            referenceType: 'PURCHASE_RETURN',
            referenceNumber: returnNo,
            referenceId: pReturn.id,
            notes: `مرتجع مشتريات ${returnNo}`,
            createdById: userId,
          },
        });
      }

      // Reduce debt to supplier
      await tx.supplier.update({
        where: { id: data.supplierId },
        data: { currentBalance: { decrement: grandTotal } },
      });

      // If linked to specific invoice, adjust invoice balanceDue
      if (data.invoiceId) {
        const inv = await tx.purchaseInvoice.findUnique({ where: { id: data.invoiceId } });
        if (inv) {
          const newDue = Math.max(0, inv.balanceDue - grandTotal);
          await tx.purchaseInvoice.update({
            where: { id: data.invoiceId },
            data: {
              balanceDue: newDue,
              paymentStatus: newDue <= 0 ? 'PAID' : inv.paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
            },
          });
        }
      }

      return pReturn;
    });
  }

  // ==========================================
  // 8. SUPPLIER PAYMENTS
  // ==========================================
  async listSupplierPayments(orgId: string, { skip, limit, supplierId, search }: any) {
    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { paymentNo: { contains: search } },
        { referenceNo: { contains: search } },
        { supplier: { nameAr: { contains: search } } },
        { supplier: { nameEn: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.supplierPayment.count({ where }),
      prisma.supplierPayment.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: true,
          invoice: true,
          createdBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async createSupplierPayment(orgId: string, data: any, userId: string) {
    const paymentNo = `SPAY-${Date.now()}`;
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new AppError('Invalid payment amount', 400);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          paymentNo,
          supplierId: data.supplierId,
          invoiceId: data.invoiceId || null,
          amount,
          paymentMethod: data.paymentMethod || 'CASH',
          referenceNo: data.referenceNo || null,
          chequeNumber: data.chequeNumber || null,
          chequeDueDate: data.chequeDueDate ? new Date(data.chequeDueDate) : null,
          notes: data.notes || null,
          createdById: userId,
        },
      });

      // Reduce supplier debt
      await tx.supplier.update({
        where: { id: data.supplierId },
        data: { currentBalance: { decrement: amount } },
      });

      // Update invoice if linked
      if (data.invoiceId) {
        const inv = await tx.purchaseInvoice.findUnique({ where: { id: data.invoiceId } });
        if (inv) {
          const newPaid = inv.paidAmount + amount;
          const newDue = Math.max(0, inv.grandTotal - newPaid);
          await tx.purchaseInvoice.update({
            where: { id: data.invoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: newDue,
              paymentStatus: newDue <= 0 ? 'PAID' : 'PARTIAL',
            },
          });
        }
      }

      return payment;
    });
  }

  // ==========================================
  // 9. PURCHASING DASHBOARD METRICS
  // ==========================================
  async getPurchasingDashboard(orgId: string, branchId?: string) {
    const whereBranch = branchId ? { branchId } : {};

    const [
      suppliersCount,
      pendingOrdersCount,
      totalPurchasesAmount,
      totalPayablesBalance,
      recentInvoices,
      recentReceipts,
    ] = await Promise.all([
      prisma.supplier.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.purchaseOrder.count({
        where: { organizationId: orgId, ...whereBranch, status: { in: ['PENDING', 'APPROVED', 'PARTIALLY_RECEIVED'] } },
      }),
      prisma.purchaseInvoice.aggregate({
        where: { organizationId: orgId, ...whereBranch },
        _sum: { grandTotal: true, paidAmount: true, balanceDue: true },
      }),
      prisma.supplier.aggregate({
        where: { organizationId: orgId },
        _sum: { currentBalance: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: { organizationId: orgId, ...whereBranch },
        take: 5,
        orderBy: { invoiceDate: 'desc' },
        include: { supplier: true, branch: true },
      }),
      prisma.goodsReceipt.findMany({
        where: { organizationId: orgId, ...whereBranch },
        take: 5,
        orderBy: { receiptDate: 'desc' },
        include: { supplier: true, branch: true, warehouse: true, items: { include: { product: true } } },
      }),
    ]);

    return {
      suppliersCount,
      pendingOrdersCount,
      totalPurchases: totalPurchasesAmount._sum.grandTotal || 0,
      totalPaidToSuppliers: totalPurchasesAmount._sum.paidAmount || 0,
      totalAccountsPayable: totalPayablesBalance._sum.currentBalance || totalPurchasesAmount._sum.balanceDue || 0,
      recentInvoices,
      recentReceipts,
    };
  }
}
