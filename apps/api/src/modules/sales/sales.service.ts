import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class SalesService {
  // --- QUOTATIONS ---
  async listQuotations(orgId: string, { skip, limit, branchId, status, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { quotationNo: { contains: search } },
        { customer: { nameEn: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.salesQuotation.count({ where }),
      prisma.salesQuotation.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          branch: true,
          items: { include: { product: true } },
          createdBy: { select: { firstNameEn: true, lastNameEn: true } },
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, data };
  }

  async getQuotationById(id: string) {
    const quote = await prisma.salesQuotation.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        items: { include: { product: true } },
        createdBy: { select: { firstNameEn: true, lastNameEn: true } },
      }
    });
    if (!quote) throw new AppError('Quotation not found', 404);
    return quote;
  }

  async createQuotation(orgId: string, data: any, userId: string) {
    const quotationNo = `QT-${Date.now()}`;
    
    let subtotal = 0;
    const itemsData = data.items.map((i: any) => {
      const lineSub = (i.quantity * i.unitPrice) - (i.discount || 0);
      const lineTax = (lineSub * (i.taxRate || 14)) / 100;
      const lineTotal = lineSub + lineTax;
      subtotal += lineSub;
      return {
        productId: i.productId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount || 0,
        taxRate: i.taxRate || 14,
        taxAmount: lineTax,
        totalPrice: lineTotal,
      };
    });

    const taxAmount = (subtotal * (data.taxRate || 14)) / 100;
    const grandTotal = Math.max(0, subtotal + taxAmount - (data.discountTotal || 0));

    const quotation = await prisma.salesQuotation.create({
      data: {
        quotationNo,
        organizationId: orgId,
        branchId: data.branchId,
        customerId: data.customerId,
        validUntil: new Date(data.validUntil),
        subtotal,
        discountTotal: data.discountTotal || 0,
        taxRate: data.taxRate || 14,
        taxAmount,
        grandTotal,
        notes: data.notes,
        terms: data.terms,
        createdById: userId,
        items: {
          create: itemsData,
        }
      },
      include: { items: true, customer: true }
    });

    createAuditLog({
      userId,
      branchId: data.branchId,
      entityType: 'SalesQuotation',
      entityId: quotation.id,
      action: 'create',
      afterData: quotation,
    });

    return quotation;
  }

  // --- SALES ORDERS ---
  async listOrders(orgId: string, { skip, limit, branchId, status, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { customer: { nameEn: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.salesOrder.count({ where }),
      prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          branch: true,
          items: { include: { product: true } },
          createdBy: { select: { firstNameEn: true, lastNameEn: true } },
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, data };
  }

  async getOrderById(id: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        items: { include: { product: true } },
        createdBy: { select: { firstNameEn: true, lastNameEn: true } },
      }
    });
    if (!order) throw new AppError('Sales order not found', 404);
    return order;
  }

  async createOrder(orgId: string, data: any, userId: string) {
    const orderNo = `SO-${Date.now()}`;
    
    let subtotal = 0;
    const itemsData = data.items.map((i: any) => {
      const lineSub = (i.quantity * i.unitPrice) - (i.discount || 0);
      const lineTax = (lineSub * (i.taxRate || 14)) / 100;
      const lineTotal = lineSub + lineTax;
      subtotal += lineSub;
      return {
        productId: i.productId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount || 0,
        taxRate: i.taxRate || 14,
        taxAmount: lineTax,
        totalPrice: lineTotal,
      };
    });

    const taxAmount = (subtotal * (data.taxRate || 14)) / 100;
    const grandTotal = Math.max(0, subtotal + taxAmount - (data.discountTotal || 0));

    const order = await prisma.salesOrder.create({
      data: {
        orderNo,
        organizationId: orgId,
        branchId: data.branchId,
        customerId: data.customerId,
        quotationId: data.quotationId,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        subtotal,
        discountTotal: data.discountTotal || 0,
        taxRate: data.taxRate || 14,
        taxAmount,
        grandTotal,
        notes: data.notes,
        createdById: userId,
        items: {
          create: itemsData,
        }
      },
      include: { items: true, customer: true }
    });

    createAuditLog({
      userId,
      branchId: data.branchId,
      entityType: 'SalesOrder',
      entityId: order.id,
      action: 'create',
      afterData: order,
    });

    return order;
  }

  // --- SALES INVOICES (WITH STRICT VEHICLE RULES & ATOMIC OUT MOVEMENT) ---
  async listInvoices(orgId: string, { skip, limit, branchId, invoiceType, paymentStatus, search, startDate, endDate }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (invoiceType) where.invoiceType = invoiceType;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { customer: { nameEn: { contains: search } } },
        { customer: { nameAr: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.salesInvoice.count({ where }),
      prisma.salesInvoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          branch: true,
          warehouse: true,
          items: {
            include: {
              product: true,
              vehicleUnit: { include: { product: true, model: { include: { brand: true } } } }
            }
          },
          payments: true,
          workOrders: {
            include: {
              vehicleUnit: { include: { product: true, model: { include: { brand: true } } } },
              assignedTechnician: true,
            },
          },
          createdBy: { select: { firstNameEn: true, lastNameEn: true } },
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, data };
  }

  async getInvoiceById(id: string) {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            vehicleUnit: { include: { product: true, model: { include: { brand: true } } } }
          }
        },
        payments: true,
        returns: { include: { items: true } },
        ownershipRecords: true,
        warranties: true,
        workOrders: {
          include: {
            vehicleUnit: { include: { product: true, model: { include: { brand: true } } } },
            assignedTechnician: true,
          },
        },
        createdBy: { select: { firstNameEn: true, lastNameEn: true } },
      }
    });
    if (!invoice) throw new AppError('Sales invoice not found', 404);
    return invoice;
  }

  async createInvoice(orgId: string, data: any, userId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new AppError('Customer not found', 404);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
      include: { branch: true }
    });
    if (!warehouse) throw new AppError('Warehouse not found', 404);

    // 1. VEHICLE VALIDATION & PRICING PREPARATION
    const vehicleUnitsToSell: any[] = [];
    for (const item of data.items) {
      if (item.vehicleUnitId) {
        const unit = await prisma.vehicleUnit.findUnique({
          where: { id: item.vehicleUnitId },
          include: { product: true }
        });

        if (!unit) {
          throw new AppError(`Vehicle unit ${item.vehicleUnitId} does not exist`, 400);
        }
        if (unit.status === 'SOLD') {
          throw new AppError(`Vehicle unit VIN: ${unit.vin} is already SOLD`, 400);
        }
        if (unit.status === 'RESERVED') {
          // Check if reserved by this customer
          const reservation = await prisma.vehicleReservation.findFirst({
            where: {
              vehicleUnitId: unit.id,
              status: 'ACTIVE',
              customerId: customer.id,
            }
          });
          if (!reservation) {
            throw new AppError(`Vehicle VIN: ${unit.vin} is reserved by another customer`, 400);
          }
        } else if (unit.status !== 'AVAILABLE') {
          throw new AppError(`Vehicle VIN: ${unit.vin} is unavailable (Status: ${unit.status})`, 400);
        }

        if (unit.warehouseId !== data.warehouseId) {
          throw new AppError(`Vehicle VIN: ${unit.vin} is not located in the selected warehouse (${warehouse.nameEn})`, 400);
        }

        vehicleUnitsToSell.push({ unit, item });
      }
    }

    // 2. ATOMIC TRANSACTION EXECUTION
    return prisma.$transaction(async (tx) => {
      const invoiceNo = `INV-${Date.now()}`;

      let subtotal = 0;
      const invoiceItemsData = [];

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new AppError(`Product ${item.productId} not found`, 404);

        // Check stock availability if not allowing negative stock
        const balance = await tx.stockBalance.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: data.warehouseId,
              productId: item.productId,
            }
          }
        });

        const currentQty = balance ? balance.quantity : 0;
        if (!product.allowNegativeStock && currentQty < item.quantity) {
          throw new AppError(
            `Insufficient stock for product ${product.nameEn}. Available: ${currentQty}, Requested: ${item.quantity}`,
            400
          );
        }

        const lineSub = (item.quantity * item.unitPrice) - (item.discount || 0);
        const lineTax = (lineSub * (item.taxRate || 14)) / 100;
        const lineTotal = lineSub + lineTax;
        subtotal += lineSub;

        invoiceItemsData.push({
          productId: item.productId,
          vehicleUnitId: item.vehicleUnitId || null,
          description: item.description,
          quantity: item.quantity,
          unitCost: product.costPrice || 0,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          taxRate: item.taxRate || 14,
          taxAmount: lineTax,
          totalPrice: lineTotal,
        });

        // Deduct inventory balance
        const updatedBal = await tx.stockBalance.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: data.warehouseId,
              productId: item.productId,
            }
          },
          update: {
            quantity: { decrement: item.quantity },
            availableQty: { decrement: item.quantity },
          },
          create: {
            warehouseId: data.warehouseId,
            productId: item.productId,
            quantity: -item.quantity,
            availableQty: -item.quantity,
            avgCost: product.costPrice || 0,
          }
        });

        // Create Stock Movement (SALE_OUT)
        await tx.stockMovement.create({
          data: {
            movementNumber: `MOV-SALE-OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            movementType: 'SALE_OUT',
            productId: item.productId,
            warehouseId: data.warehouseId,
            branchId: data.branchId,
            vehicleUnitId: item.vehicleUnitId || null,
            quantity: item.quantity,
            unitCost: product.costPrice || 0,
            totalCost: (product.costPrice || 0) * item.quantity,
            beforeQuantity: updatedBal.quantity + item.quantity,
            afterQuantity: updatedBal.quantity,
            referenceType: 'SALES_INVOICE',
            referenceNumber: invoiceNo,
            notes: `Sold to customer: ${customer.nameEn}`,
            createdById: userId,
          }
        });
      }

      const discountTotal = Number(data.discountTotal) || 0;
      const effectiveTaxRate = data.taxRate !== undefined ? Number(data.taxRate) : 14;
      const taxableBase = Math.max(0, subtotal - discountTotal);
      const taxAmount = (taxableBase * effectiveTaxRate) / 100;
      const grandTotal = Math.max(0, taxableBase + taxAmount);
      const paidAmount = Number(data.paidAmount) || 0;
      const balanceDue = Math.max(0, grandTotal - paidAmount);

      const paymentStatus = balanceDue <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

      // Check credit limit for credit/partial sales
      if (balanceDue > 0 && data.invoiceType !== 'CASH') {
        if (customer.creditLimit > 0 && (customer.currentBalance + balanceDue) > customer.creditLimit) {
          throw new AppError(
            `Customer credit limit exceeded. Current balance: ${customer.currentBalance}, Limit: ${customer.creditLimit}, New debt: ${balanceDue}`,
            400
          );
        }
      }

      // Create Invoice
      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNo,
          organizationId: orgId,
          branchId: data.branchId,
          warehouseId: data.warehouseId,
          customerId: data.customerId,
          orderId: data.orderId || null,
          quotationId: data.quotationId || null,
          invoiceType: data.invoiceType || 'CASH',
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          subtotal,
          discountTotal,
          taxRate: effectiveTaxRate,
          taxAmount,
          grandTotal,
          paidAmount,
          balanceDue,
          paymentStatus,
          status: 'COMPLETED',
          notes: data.notes,
          createdById: userId,
          items: {
            create: invoiceItemsData,
          }
        },
        include: { items: true, customer: true }
      });

      // Update customer balance
      if (balanceDue > 0) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { currentBalance: { increment: balanceDue } }
        });
      }

      // Record payment if paidAmount > 0
      if (paidAmount > 0) {
        await tx.customerPayment.create({
          data: {
            paymentNo: `PAY-${Date.now()}`,
            customerId: customer.id,
            invoiceId: invoice.id,
            amount: paidAmount,
            paymentMethod: data.paymentMethod || 'CASH',
            status: 'CLEARED',
            notes: `Immediate payment on invoice ${invoiceNo}`,
            receivedById: userId,
          }
        });
      }

      // Process Vehicle sales side-effects:
      // - Unit status = SOLD
      // - Customer ownership record
      // - Warranty record
      // - Sales commission record
      for (const { unit } of vehicleUnitsToSell) {
        await tx.vehicleUnit.update({
          where: { id: unit.id },
          data: { status: 'SOLD' }
        });

        // Close any active reservation
        await tx.vehicleReservation.updateMany({
          where: { vehicleUnitId: unit.id, status: 'ACTIVE' },
          data: { status: 'CONVERTED_TO_SALE' }
        });

        // Create Customer Ownership Record
        await tx.customerOwnership.create({
          data: {
            customerId: customer.id,
            vehicleUnitId: unit.id,
            invoiceId: invoice.id,
            purchaseDate: new Date(),
            notes: `Purchased under Invoice ${invoiceNo}`,
          }
        });

        // Create Warranty Record (default 12 months)
        const warrantyEndDate = new Date();
        warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + 1);

        await tx.warrantyRecord.create({
          data: {
            vehicleUnitId: unit.id,
            invoiceId: invoice.id,
            startDate: new Date(),
            endDate: warrantyEndDate,
            maxMileage: 10000,
            status: 'ACTIVE',
            terms: 'Standard 1-year dealership warranty covering engine and transmission.',
          }
        });
      }

      // Calculate optional Sales Commission (e.g. 1% default on grand total)
      await tx.salesCommission.create({
        data: {
          invoiceId: invoice.id,
          userId,
          percentage: 1.0,
          amount: (grandTotal * 0.01),
          status: 'PENDING',
        }
      });

      createAuditLog({
        userId,
        branchId: data.branchId,
        entityType: 'SalesInvoice',
        entityId: invoice.id,
        action: 'create',
        afterData: invoice,
      });

      return invoice;
    });
  }

  /**
   * Comprehensive Update of Invoice:
   * Supports modifying notes, payment status, discount, and fully editing invoice line items
   * (adding new products, deleting items, updating quantities and prices) with stock adjustment.
   */
  async updateInvoice(id: string, data: any, userId: string) {
    const existing = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true, vehicleUnit: true } },
        payments: true,
        branch: true,
      },
    });
    if (!existing) throw new AppError('Invoice not found', 404);

    return prisma.$transaction(async (tx) => {
      let subtotal = existing.subtotal;
      let discountTotal = data.discountTotal !== undefined ? Number(data.discountTotal) : existing.discountTotal;
      let effectiveTaxRate = data.taxRate !== undefined ? Number(data.taxRate) : existing.taxRate;
      let itemsUpdated = false;

      // If items array is provided, perform full items synchronization & stock adjustment
      if (Array.isArray(data.items)) {
        itemsUpdated = true;
        subtotal = 0;

        // 1. Revert previous inventory deductions for items being removed or changed
        for (const oldItem of existing.items) {
          if (oldItem.product?.type !== 'SERVICE') {
            await tx.stockBalance.upsert({
              where: {
                warehouseId_productId: {
                  warehouseId: existing.warehouseId,
                  productId: oldItem.productId,
                },
              },
              update: {
                quantity: { increment: oldItem.quantity },
                availableQty: { increment: oldItem.quantity },
              },
              create: {
                warehouseId: existing.warehouseId,
                productId: oldItem.productId,
                quantity: oldItem.quantity,
                availableQty: oldItem.quantity,
                avgCost: oldItem.unitCost || 0,
              },
            });

            // Revert vehicle status if it was a sold unit
            if (oldItem.vehicleUnitId) {
              await tx.vehicleUnit.update({
                where: { id: oldItem.vehicleUnitId },
                data: { status: 'AVAILABLE' },
              });
            }
          }
        }

        // 2. Delete existing items
        await tx.salesInvoiceItem.deleteMany({
          where: { invoiceId: id },
        });

        // 3. Insert new/updated items and apply new inventory movements
        for (const item of data.items) {
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice) || 0;
          const discount = Number(item.discount) || 0;
          const lineTaxRate = item.taxRate !== undefined ? Number(item.taxRate) : effectiveTaxRate;
          const lineTotal = (qty * unitPrice) - discount;
          const lineTax = (lineTotal * lineTaxRate) / 100;
          const finalLineTotal = lineTotal + lineTax;

          subtotal += (qty * unitPrice);

          const prod = await tx.product.findUnique({ where: { id: item.productId } });

          await tx.salesInvoiceItem.create({
            data: {
              invoiceId: id,
              productId: item.productId,
              vehicleUnitId: item.vehicleUnitId || null,
              description: item.description || null,
              quantity: qty,
              unitCost: prod?.costPrice || 0,
              unitPrice: unitPrice,
              discount: discount,
              taxRate: lineTaxRate,
              taxAmount: lineTax,
              totalPrice: finalLineTotal,
            },
          });

          // Deduct stock for inventory products
          if (prod && prod.type !== 'SERVICE') {
            await tx.stockBalance.upsert({
              where: {
                warehouseId_productId: {
                  warehouseId: existing.warehouseId,
                  productId: item.productId,
                },
              },
              update: {
                quantity: { decrement: qty },
                availableQty: { decrement: qty },
              },
              create: {
                warehouseId: existing.warehouseId,
                productId: item.productId,
                quantity: -qty,
                availableQty: -qty,
                avgCost: prod.costPrice || 0,
              },
            });

            if (item.vehicleUnitId) {
              await tx.vehicleUnit.update({
                where: { id: item.vehicleUnitId },
                data: { status: 'SOLD' },
              });
            }
          }
        }
      }

      // Financial calculations
      const taxable = Math.max(0, subtotal - discountTotal);
      const taxAmount = (taxable * effectiveTaxRate) / 100;
      const grandTotal = taxable + taxAmount;
      const paidAmount = data.paidAmount !== undefined ? Number(data.paidAmount) : existing.paidAmount;
      const balanceDue = Math.max(0, grandTotal - paidAmount);
      const paymentStatus = data.paymentStatus || (balanceDue <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID');

      // Adjust customer balance difference
      const balanceDiff = balanceDue - existing.balanceDue;
      if (balanceDiff !== 0) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { currentBalance: { increment: balanceDiff } },
        });
      }

      const updated = await tx.salesInvoice.update({
        where: { id },
        data: {
          invoiceType: data.invoiceType || existing.invoiceType,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          dueDate: data.dueDate ? new Date(data.dueDate) : existing.dueDate,
          subtotal,
          discountTotal,
          taxRate: effectiveTaxRate,
          taxAmount,
          grandTotal,
          paidAmount,
          balanceDue,
          paymentStatus,
        },
        include: {
          customer: true,
          branch: true,
          warehouse: true,
          items: { include: { product: true, vehicleUnit: true } },
          payments: true,
        },
      });

      createAuditLog({
        userId,
        branchId: existing.branchId,
        entityType: 'SalesInvoice',
        entityId: id,
        action: 'full_update',
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    });
  }

  // --- SALES RETURNS ---
  async listReturns(orgId: string, { skip, limit, branchId, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (search) {
      where.OR = [
        { returnNo: { contains: search } },
        { invoice: { invoiceNo: { contains: search } } },
        { customer: { nameEn: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.salesReturn.count({ where }),
      prisma.salesReturn.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          invoice: true,
          branch: true,
          warehouse: true,
          items: { include: { product: true } },
          createdBy: { select: { firstNameEn: true, lastNameEn: true } },
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, data };
  }

  async createReturn(orgId: string, data: any, userId: string) {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: data.invoiceId },
      include: { customer: true, items: true }
    });
    if (!invoice) throw new AppError('Invoice not found', 404);

    return prisma.$transaction(async (tx) => {
      const returnNo = `RET-${Date.now()}`;

      let subtotal = 0;
      const returnItemsData = [];

      for (const item of data.items) {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;

        returnItemsData.push({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: lineTotal,
          condition: item.condition || 'GOOD',
        });

        // If returned in good condition, restock back into inventory
        if (item.condition === 'GOOD') {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          const tgtBal = await tx.stockBalance.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: data.warehouseId,
                productId: item.productId,
              }
            },
            update: {
              quantity: { increment: item.quantity },
              availableQty: { increment: item.quantity },
            },
            create: {
              warehouseId: data.warehouseId,
              productId: item.productId,
              quantity: item.quantity,
              availableQty: item.quantity,
              avgCost: product?.costPrice || 0,
            }
          });

          await tx.stockMovement.create({
            data: {
              movementNumber: `MOV-RET-IN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              movementType: 'RETURN_IN',
              productId: item.productId,
              warehouseId: data.warehouseId,
              branchId: invoice.branchId,
              quantity: item.quantity,
              unitCost: product?.costPrice || 0,
              totalCost: (product?.costPrice || 0) * item.quantity,
              beforeQuantity: tgtBal.quantity - item.quantity,
              afterQuantity: tgtBal.quantity,
              referenceType: 'SALES_RETURN',
              referenceNumber: returnNo,
              notes: `Sales return from invoice ${invoice.invoiceNo}`,
              createdById: userId,
            }
          });
        }
      }

      const taxAmount = (subtotal * 0.14);
      const grandTotal = subtotal + taxAmount;

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNo,
          organizationId: orgId,
          branchId: invoice.branchId,
          warehouseId: data.warehouseId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          reason: data.reason,
          subtotal,
          taxAmount,
          grandTotal,
          refundStatus: data.refundStatus || 'REFUNDED',
          notes: data.notes,
          createdById: userId,
          items: {
            create: returnItemsData,
          }
        },
        include: { items: true }
      });

      // If credit to account, reduce customer debt or increase credit
      if (data.refundStatus === 'CREDITED_TO_ACCOUNT') {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { currentBalance: { decrement: grandTotal } }
        });
      }

      createAuditLog({
        userId,
        branchId: invoice.branchId,
        entityType: 'SalesReturn',
        entityId: salesReturn.id,
        action: 'create',
        afterData: salesReturn,
      });

      return salesReturn;
    });
  }

  // --- CUSTOMER PAYMENTS ---
  async createPayment(data: any, userId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new AppError('Customer not found', 404);

    return prisma.$transaction(async (tx) => {
      const paymentNo = `PAY-${Date.now()}`;
      const payment = await tx.customerPayment.create({
        data: {
          paymentNo,
          customerId: data.customerId,
          invoiceId: data.invoiceId || null,
          amount: data.amount,
          paymentMethod: data.paymentMethod || 'CASH',
          referenceNo: data.referenceNo,
          chequeNumber: data.chequeNumber,
          chequeDueDate: data.chequeDueDate ? new Date(data.chequeDueDate) : null,
          status: 'CLEARED',
          notes: data.notes,
          receivedById: userId,
        }
      });

      // Deduct customer balance
      await tx.customer.update({
        where: { id: data.customerId },
        data: { currentBalance: { decrement: data.amount } }
      });

      // If tied to an invoice, reduce balanceDue and increase paidAmount
      if (data.invoiceId) {
        const inv = await tx.salesInvoice.findUnique({ where: { id: data.invoiceId } });
        if (inv) {
          const newPaid = inv.paidAmount + data.amount;
          const newDue = Math.max(0, inv.grandTotal - newPaid);
          const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';

          await tx.salesInvoice.update({
            where: { id: data.invoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: newDue,
              paymentStatus: newStatus,
            }
          });
        }
      }

      createAuditLog({
        userId,
        entityType: 'CustomerPayment',
        entityId: payment.id,
        action: 'create',
        afterData: payment,
      });

      return payment;
    });
  }

  /**
   * Cancel/Void Customer Payment:
   * Reverses payment from invoice and restores customer balance.
   */
  async cancelCustomerPayment(paymentId: string, userId: string) {
    const payment = await prisma.customerPayment.findUnique({
      where: { id: paymentId },
      include: { invoice: true, customer: true },
    });
    if (!payment) throw new AppError('عملية السداد غير موجودة', 404);

    return prisma.$transaction(async (tx) => {
      // 1. Re-add balance to customer (debt increases again)
      await tx.customer.update({
        where: { id: payment.customerId },
        data: { currentBalance: { increment: payment.amount } },
      });

      // 2. Adjust invoice if tied
      if (payment.invoiceId) {
        const inv = await tx.salesInvoice.findUnique({ where: { id: payment.invoiceId } });
        if (inv) {
          const newPaid = Math.max(0, inv.paidAmount - payment.amount);
          const newDue = Math.max(0, inv.grandTotal - newPaid);
          const newStatus = newDue <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';

          await tx.salesInvoice.update({
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
      await tx.customerPayment.delete({
        where: { id: paymentId },
      });

      createAuditLog({
        userId,
        entityType: 'CustomerPayment',
        entityId: paymentId,
        action: 'cancel',
        beforeData: payment,
      });

      return { success: true, message: 'تم إلغاء عملية السداد بنجاح وإعادة رصيد العميل والفاتورة' };
    });
  }

  /**
   * Cancel Stock Issue / Goods Issue for Invoice:
   * Reverses stock movements and restores products and vehicles back to warehouse.
   */
  async cancelInvoiceGoodsIssue(invoiceId: string, userId: string) {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: { include: { product: true } },
      },
    });
    if (!invoice) throw new AppError('الفاتورة غير موجودة', 404);

    const movements = await prisma.stockMovement.findMany({
      where: {
        referenceType: 'SALES_INVOICE',
        referenceNumber: invoice.invoiceNo,
      },
    });

    if (movements.length === 0) {
      return { success: true, message: 'لا توجد أذونات صرف أو حركات مخزنية معلقة لهذه الفاتورة' };
    }

    return prisma.$transaction(async (tx) => {
      // Restock items
      for (const mov of movements) {
        if (mov.quantity > 0) {
          await tx.stockBalance.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: mov.warehouseId,
                productId: mov.productId,
              },
            },
            update: {
              quantity: { increment: mov.quantity },
              availableQty: { increment: mov.quantity },
            },
            create: {
              warehouseId: mov.warehouseId,
              productId: mov.productId,
              quantity: mov.quantity,
              availableQty: mov.quantity,
              avgCost: mov.unitCost || 0,
            },
          });

          // If vehicle was sold, return status to AVAILABLE
          if (mov.vehicleUnitId) {
            await tx.vehicleUnit.update({
              where: { id: mov.vehicleUnitId },
              data: { status: 'AVAILABLE' },
            });
          }

          // Create reversing movement
          await tx.stockMovement.create({
            data: {
              movementNumber: `MOV-REV-OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              movementType: 'SALE_RETURN',
              productId: mov.productId,
              warehouseId: mov.warehouseId,
              branchId: mov.branchId,
              vehicleUnitId: mov.vehicleUnitId || null,
              quantity: mov.quantity,
              unitCost: mov.unitCost,
              totalCost: mov.totalCost,
              referenceType: 'SALES_INVOICE_CANCEL_ISSUE',
              referenceNumber: invoice.invoiceNo,
              notes: `إلغاء إذن صرف الفاتورة ${invoice.invoiceNo} وإعادة البضاعة للمخزن`,
              createdById: userId,
            },
          });
        }
      }

      // Delete the original dispatch movements
      await tx.stockMovement.deleteMany({
        where: {
          referenceType: 'SALES_INVOICE',
          referenceNumber: invoice.invoiceNo,
        },
      });

      return { success: true, message: 'تم إلغاء إذن الصرف المخزني وإرجاع كافة المنتجات والمركبات إلى رصيد المستودع بنجاح' };
    });
  }

  /**
   * Delete / Cancel Invoice with Strict Protection Rules:
   * 1. Cannot delete if there are active payments (must cancel payments first).
   * 2. Cannot delete if stock has not been returned via cancelInvoiceGoodsIssue.
   */
  async deleteInvoice(invoiceId: string, userId: string) {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        customer: true,
      },
    });
    if (!invoice) throw new AppError('الفاتورة غير موجودة', 404);

    // 1. Verify Payments are cleared
    if (invoice.payments && invoice.payments.length > 0) {
      throw new AppError(
        `لا يمكن حذف الفاتورة! توجد (${invoice.payments.length}) عملية سداد مسجلة. يجب إلغاء كل السدادات أولاً.`,
        400
      );
    }

    if (invoice.paidAmount > 0) {
      throw new AppError(
        `لا يمكن حذف الفاتورة! يوجد مبلغ مسدد بقيمة ${invoice.paidAmount} ج.م. يجب إلغاء السداد أولاً.`,
        400
      );
    }

    // 2. Verify Stock Dispatch has been cancelled
    const activeMovements = await prisma.stockMovement.findMany({
      where: {
        referenceType: 'SALES_INVOICE',
        referenceNumber: invoice.invoiceNo,
      },
    });

    if (activeMovements.length > 0) {
      throw new AppError(
        'لا يمكن حذف الفاتورة! البضاعة تم صرفها من المخزن بالفعل. يجب الضغط على "إلغاء إذن الصرف المخزني" لإعادة المنتجات للمخزن قبل حذف الفاتورة.',
        400
      );
    }

    return prisma.$transaction(async (tx) => {
      // Revert customer balance if there was balanceDue
      if (invoice.balanceDue > 0) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { currentBalance: { decrement: invoice.balanceDue } },
        });
      }

      // Clean up linked auxiliary records
      await tx.salesCommission.deleteMany({ where: { invoiceId } });
      await tx.warrantyRecord.deleteMany({ where: { invoiceId } });
      await tx.customerOwnership.deleteMany({ where: { invoiceId } });
      await tx.salesInvoiceItem.deleteMany({ where: { invoiceId } });

      // Delete invoice
      await tx.salesInvoice.delete({ where: { id: invoiceId } });

      createAuditLog({
        userId,
        branchId: invoice.branchId,
        entityType: 'SalesInvoice',
        entityId: invoiceId,
        action: 'delete',
        beforeData: invoice,
      });

      return { success: true, message: 'تم حذف الفاتورة بنجاح بعد استيفاء شروط إلغاء السداد وإذن الصرف' };
    });
  }

  // --- DASHBOARD METRICS ---
  async getSalesDashboard(orgId: string, branchId?: string) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;

    const [totalInvoices, totalRevenueAgg, unpaidCount, totalCustomers, recentInvoices] = await Promise.all([
      prisma.salesInvoice.count({ where }),
      prisma.salesInvoice.aggregate({
        where,
        _sum: { grandTotal: true, paidAmount: true, balanceDue: true }
      }),
      prisma.salesInvoice.count({ where: { ...where, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } } }),
      prisma.customer.count({ where: { organizationId: orgId } }),
      prisma.salesInvoice.findMany({
        where,
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, branch: true }
      })
    ]);

    return {
      totalInvoices,
      totalSalesRevenue: totalRevenueAgg._sum.grandTotal || 0,
      totalCollected: totalRevenueAgg._sum.paidAmount || 0,
      totalOutstanding: totalRevenueAgg._sum.balanceDue || 0,
      unpaidInvoicesCount: unpaidCount,
      totalCustomers,
      recentInvoices,
    };
  }
}
