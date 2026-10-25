import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class WorkshopService {
  /**
   * List work orders with pagination, search, and status/branch filters
   */
  async listWorkOrders(orgId: string, { skip, limit, branchId, status, search, customerId, vehicleUnitId, startDate, endDate }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (vehicleUnitId) where.vehicleUnitId = vehicleUnitId;
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
        { orderNumber: { contains: search } },
        { licensePlate: { contains: search } },
        { customer: { nameEn: { contains: search } } },
        { customer: { nameAr: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { vehicleUnit: { vin: { contains: search } } },
        { vehicleUnit: { engineNumber: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.workOrder.count({ where }),
      prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          branch: true,
          warehouse: true,
          vehicleUnit: {
            include: {
              product: true,
              model: { include: { brand: true } },
            },
          },
          receptionEmployee: { select: { id: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
          assignedTechnician: { select: { id: true, firstNameEn: true, lastNameEn: true } },
          items: {
            include: {
              product: true,
              technician: { select: { id: true, firstNameEn: true, lastNameEn: true } },
            },
          },
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  /**
   * Get single work order by ID
   */
  async getWorkOrderById(id: string) {
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        warehouse: true,
        vehicleUnit: {
          include: {
            product: true,
            model: { include: { brand: true } },
          },
        },
        receptionEmployee: { select: { id: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
        assignedTechnician: { select: { id: true, firstNameEn: true, lastNameEn: true } },
        items: {
          include: {
            product: true,
            technician: { select: { id: true, firstNameEn: true, lastNameEn: true } },
          },
        },
        odometerHistories: {
          orderBy: { recordedAt: 'desc' },
        },
        invoice: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!wo) throw new AppError('Work order not found', 404);
    return wo;
  }

  /**
   * 1. VEHICLE RECEPTION
   * Creates a new work order, validates odometer monotonically (or requires override reason),
   * sets vehicleUnit status to IN_SERVICE, and stores immutable odometer history.
   */
  async createReception(orgId: string, data: any, userId: string, userPermissions: string[] = []) {
    // 1. Verify customer
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new AppError('Customer not found', 404);

    // 2. Verify vehicle unit
    const vehicle = await prisma.vehicleUnit.findUnique({
      where: { id: data.vehicleUnitId },
      include: { product: true },
    });
    if (!vehicle) throw new AppError('Vehicle unit not found', 404);

    // 3. Monotonic Odometer check
    const lastOdo = await prisma.odometerHistory.findFirst({
      where: { vehicleUnitId: vehicle.id },
      orderBy: { recordedAt: 'desc' },
    });

    const previousReading = lastOdo ? lastOdo.reading : vehicle.mileage;
    if (previousReading && data.odometerReading < previousReading) {
      if (!data.overrideReason) {
        throw new AppError(
          `Odometer reading (${data.odometerReading} km) cannot be lower than previous reading (${previousReading} km) without an authorized override reason`,
          400
        );
      }
      const canOverride = userPermissions.includes('workshop.override_odometer') || userPermissions.includes('*');
      if (!canOverride) {
        throw new AppError('You do not have permission to override odometer validation', 403);
      }
    }

    const orderNumber = `WO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create work order
      const workOrder = await tx.workOrder.create({
        data: {
          orderNumber,
          organizationId: orgId,
          branchId: data.branchId,
          warehouseId: data.warehouseId,
          customerId: data.customerId,
          vehicleUnitId: data.vehicleUnitId,
          receptionEmployeeId: userId,
          assignedTechnicianId: data.assignedTechnicianId || null,
          status: 'RECEIVED',
          odometerReading: data.odometerReading,
          fuelLevel: data.fuelLevel || null,
          licensePlate: data.licensePlate || null,
          complaint: data.complaint || null,
          conditionNotes: data.conditionNotes || null,
          accessories: data.accessories || null,
          photos: data.photos || null,
          notes: data.notes || null,
        },
        include: {
          customer: true,
          vehicleUnit: true,
          branch: true,
        },
      });

      // Immutable odometer history
      await tx.odometerHistory.create({
        data: {
          vehicleUnitId: vehicle.id,
          workOrderId: workOrder.id,
          reading: data.odometerReading,
          overrideReason: data.overrideReason || null,
        },
      });

      // Update vehicle mileage and set status to IN_SERVICE
      await tx.vehicleUnit.update({
        where: { id: vehicle.id },
        data: {
          mileage: Math.max(vehicle.mileage, data.odometerReading),
          status: 'IN_SERVICE',
        },
      });

      return workOrder;
    });

    createAuditLog({
      userId,
      branchId: data.branchId,
      entityType: 'WorkOrder',
      entityId: result.id,
      action: 'create_reception',
      afterData: result,
    });

    return result;
  }

  /**
   * Update work order details (status, technician, complaint, etc.)
   */
  async updateWorkOrder(id: string, data: any, userId: string) {
    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo) throw new AppError('Work order not found', 404);

    if (wo.status === 'COMPLETED' || wo.status === 'INVOICED' || wo.status === 'DELIVERED') {
      if (data.status && data.status !== wo.status) {
        // allow delivery transition if completed/invoiced
        if (data.status !== 'DELIVERED' && data.status !== 'INVOICED') {
          throw new AppError(`Cannot alter status of ${wo.status} work order`, 400);
        }
      }
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        assignedTechnicianId: data.assignedTechnicianId !== undefined ? data.assignedTechnicianId : wo.assignedTechnicianId,
        status: data.status || wo.status,
        fuelLevel: data.fuelLevel !== undefined ? data.fuelLevel : wo.fuelLevel,
        complaint: data.complaint !== undefined ? data.complaint : wo.complaint,
        conditionNotes: data.conditionNotes !== undefined ? data.conditionNotes : wo.conditionNotes,
        accessories: data.accessories !== undefined ? data.accessories : wo.accessories,
        photos: data.photos !== undefined ? data.photos : wo.photos,
        notes: data.notes !== undefined ? data.notes : wo.notes,
      },
      include: {
        customer: true,
        vehicleUnit: true,
        items: { include: { product: true } },
      },
    });

    createAuditLog({
      userId,
      branchId: wo.branchId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'update',
      beforeData: wo,
      afterData: updated,
    });

    return updated;
  }

  /**
   * 2. ADD WORK ORDER LINE (Part or Service)
   * Validates product, calculates tax/discounts, and reserves stock for physical spare parts.
   */
  async addWorkOrderItem(workOrderId: string, data: any, userId: string) {
    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) throw new AppError('Work order not found', 404);

    if (['COMPLETED', 'INVOICED', 'DELIVERED', 'CANCELLED'].includes(wo.status)) {
      throw new AppError(`Cannot add items to work order in status ${wo.status}`, 400);
    }

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new AppError('Product/Service not found', 404);

    const isService = product.type === 'SERVICE';
    const quantity = Number(data.quantity) || 1;
    const unitPrice = data.unitPrice !== undefined ? Number(data.unitPrice) : product.retailPrice;
    const discount = Number(data.discount) || 0;
    const taxRate = data.taxRate !== undefined ? Number(data.taxRate) : 14;

    const lineSub = (quantity * unitPrice) - discount;
    const lineTax = (lineSub * taxRate) / 100;
    const totalPrice = Math.max(0, lineSub + lineTax);

    return await prisma.$transaction(async (tx) => {
      // If it's a physical product, check available quantity and reserve stock
      if (!isService) {
        const balance = await tx.stockBalance.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: wo.warehouseId,
              productId: product.id,
            },
          },
        });

        const available = balance ? balance.availableQty : 0;
        if (available < quantity) {
          throw new AppError(
            `Insufficient stock for ${product.nameEn}. Available: ${available}, Requested: ${quantity}`,
            400
          );
        }

        // Reserve stock: decrement availableQty, increment reservedQty
        await tx.stockBalance.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: wo.warehouseId,
              productId: product.id,
            },
          },
          update: {
            availableQty: { decrement: quantity },
            reservedQty: { increment: quantity },
          },
          create: {
            warehouseId: wo.warehouseId,
            productId: product.id,
            quantity: 0,
            availableQty: -quantity,
            reservedQty: quantity,
          },
        });
      }

      const item = await tx.workOrderItem.create({
        data: {
          workOrderId: wo.id,
          productId: product.id,
          quantity,
          unitPrice,
          discount,
          taxRate,
          taxAmount: lineTax,
          totalPrice,
          technicianId: data.technicianId || null,
          notes: data.notes || null,
        },
        include: {
          product: true,
          technician: true,
        },
      });

      return item;
    });
  }

  /**
   * Remove work order line item & unreserve physical stock
   */
  async removeWorkOrderItem(itemId: string, userId: string) {
    const item = await prisma.workOrderItem.findUnique({
      where: { id: itemId },
      include: { workOrder: true, product: true },
    });
    if (!item) throw new AppError('Work order item not found', 404);

    const wo = item.workOrder;
    if (['COMPLETED', 'INVOICED', 'DELIVERED', 'CANCELLED'].includes(wo.status)) {
      throw new AppError(`Cannot remove items from work order in status ${wo.status}`, 400);
    }

    await prisma.$transaction(async (tx) => {
      if (item.product.type !== 'SERVICE') {
        // Release reservation
        await tx.stockBalance.update({
          where: {
            warehouseId_productId: {
              warehouseId: wo.warehouseId,
              productId: item.productId,
            },
          },
          data: {
            availableQty: { increment: item.quantity },
            reservedQty: { decrement: item.quantity },
          },
        });
      }

      await tx.workOrderItem.delete({ where: { id: itemId } });
    });

    return { success: true, message: 'Item removed and reserved stock released' };
  }

  /**
   * 3. COMPLETE WORK ORDER & GENERATE INVOICE (ATOMIC & IDEMPOTENT)
   * Performs an atomic database transaction:
   *  - Validates lines and status
   *  - Idempotency: If already invoiced, returns existing invoice
   *  - Creates exactly one SalesInvoice linked to WorkOrder
   *  - Copies lines into SalesInvoiceItem
   *  - Consumes physical parts (SERVICE_OUT stock movement & decreases reservedQty + total quantity)
   *  - Creates CustomerPayment if paidAmount > 0
   *  - Updates customer balance
   *  - Changes work order status to COMPLETED / INVOICED
   *  - Logs audit trail
   */
  async completeAndGenerateInvoice(workOrderId: string, data: any, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          customer: true,
          vehicleUnit: true,
          items: { include: { product: true } },
          invoice: true,
        },
      });

      if (!wo) throw new AppError('Work order not found', 404);

      // Idempotency: if already has invoice, return it
      if (wo.invoiceId) {
        const existingInvoice = await tx.salesInvoice.findUnique({
          where: { id: wo.invoiceId },
          include: { items: true, payments: true },
        });
        if (existingInvoice) return existingInvoice;
      }

      if (wo.status === 'CANCELLED') {
        throw new AppError('Cannot complete a cancelled work order', 400);
      }

      if (!wo.items || wo.items.length === 0) {
        throw new AppError('Cannot complete work order with no parts or services added', 400);
      }

      // Calculate totals
      let subtotal = 0;
      let discountTotal = 0;
      let taxAmount = 0;
      const invoiceItemsData: any[] = [];

      for (const item of wo.items) {
        const lineSub = (item.quantity * item.unitPrice) - item.discount;
        const lineTax = (lineSub * item.taxRate) / 100;
        const lineTotal = lineSub + lineTax;

        subtotal += item.quantity * item.unitPrice;
        discountTotal += item.discount;
        taxAmount += lineTax;

        invoiceItemsData.push({
          productId: item.productId,
          vehicleUnitId: wo.vehicleUnitId,
          description: `${item.product.nameEn} (${item.product.type === 'SERVICE' ? 'Service/Labor' : 'Spare Part'})`,
          quantity: item.quantity,
          unitCost: item.product.costPrice || 0,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
          taxAmount: lineTax,
          totalPrice: lineTotal,
        });

        // If physical product: consume stock (decrement total quantity & reservedQty)
        if (item.product.type !== 'SERVICE') {
          const updatedBal = await tx.stockBalance.update({
            where: {
              warehouseId_productId: {
                warehouseId: wo.warehouseId,
                productId: item.productId,
              },
            },
            data: {
              quantity: { decrement: item.quantity },
              reservedQty: { decrement: item.quantity },
            },
          });

          // Create auditable Stock Movement (SERVICE_OUT)
          await tx.stockMovement.create({
            data: {
              movementNumber: `MOV-SRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              movementType: 'SERVICE_OUT',
              productId: item.productId,
              warehouseId: wo.warehouseId,
              branchId: wo.branchId,
              vehicleUnitId: wo.vehicleUnitId,
              quantity: item.quantity,
              unitCost: item.product.costPrice || 0,
              totalCost: (item.product.costPrice || 0) * item.quantity,
              beforeQuantity: updatedBal.quantity + item.quantity,
              afterQuantity: updatedBal.quantity,
              referenceType: 'SERVICE_ORDER',
              referenceNumber: wo.orderNumber,
              notes: `Consumed in Work Order: ${wo.orderNumber}`,
              createdById: userId,
            },
          });
        }
      }

      const grandTotal = Math.max(0, subtotal - discountTotal + taxAmount);
      const paidAmount = Number(data.paidAmount) || 0;
      const balanceDue = Math.max(0, grandTotal - paidAmount);
      const paymentStatus = balanceDue <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
      const invoiceNo = `INV-SRV-${Date.now()}`;

      // Create SalesInvoice
      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNo,
          organizationId: wo.organizationId,
          branchId: wo.branchId,
          warehouseId: wo.warehouseId,
          customerId: wo.customerId,
          invoiceType: 'CASH',
          subtotal,
          discountTotal,
          taxRate: 14,
          taxAmount,
          grandTotal,
          paidAmount,
          balanceDue,
          paymentStatus,
          status: 'COMPLETED',
          notes: data.notes || `Workshop Service Invoice for ${wo.orderNumber}`,
          createdById: userId,
          items: {
            create: invoiceItemsData,
          },
        },
        include: {
          items: true,
          customer: true,
          branch: true,
        },
      });

      // Update customer balance if remaining debt
      if (balanceDue > 0) {
        await tx.customer.update({
          where: { id: wo.customerId },
          data: { currentBalance: { increment: balanceDue } },
        });
      }

      // Record payment if any
      if (paidAmount > 0) {
        await tx.customerPayment.create({
          data: {
            paymentNo: `PAY-SRV-${Date.now()}`,
            customerId: wo.customerId,
            invoiceId: invoice.id,
            amount: paidAmount,
            paymentMethod: data.paymentMethod || 'CASH',
            status: 'CLEARED',
            notes: `Initial payment for Workshop Invoice ${invoiceNo}`,
            receivedById: userId,
          },
        });
      }

      // Update work order status and attach invoiceId
      await tx.workOrder.update({
        where: { id: wo.id },
        data: {
          status: 'INVOICED',
          invoiceId: invoice.id,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          branchId: wo.branchId,
          entityType: 'WorkOrder',
          entityId: wo.id,
          action: 'complete_and_invoice',
          afterData: JSON.stringify({ invoiceId: invoice.id, grandTotal, paidAmount, balanceDue }),
        },
      });

      return invoice;
    });
  }

  /**
   * 4. VEHICLE DELIVERY
   * Records handover person, changes work order status to DELIVERED, and releases vehicle back to AVAILABLE/SOLD.
   */
  async deliverVehicle(workOrderId: string, data: any, userId: string) {
    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { invoice: true, vehicleUnit: true },
    });
    if (!wo) throw new AppError('Work order not found', 404);

    if (wo.status === 'DELIVERED') {
      throw new AppError('Vehicle has already been delivered', 400);
    }

    if (wo.status !== 'INVOICED' && wo.status !== 'COMPLETED') {
      throw new AppError('Vehicle cannot be delivered before completing and invoicing the service', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const deliveredWo = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: 'DELIVERED',
          notes: `${wo.notes ? wo.notes + ' | ' : ''}Delivered to: ${data.recipientName} (ID: ${data.recipientNationalId || 'N/A'}). Handover Notes: ${data.handoverNotes || 'None'}`,
        },
        include: {
          customer: true,
          vehicleUnit: true,
          invoice: true,
        },
      });

      // Update vehicle status back to AVAILABLE or SOLD
      await tx.vehicleUnit.update({
        where: { id: wo.vehicleUnitId },
        data: { status: 'AVAILABLE' },
      });

      return deliveredWo;
    });

    createAuditLog({
      userId,
      branchId: wo.branchId,
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'deliver_vehicle',
      afterData: updated,
    });

    return updated;
  }

  /**
   * 5. SERVICE HISTORY (Vehicle & Customer View)
   */
  async getVehicleServiceHistory(vehicleUnitId: string) {
    const vehicle = await prisma.vehicleUnit.findUnique({
      where: { id: vehicleUnitId },
      include: {
        product: true,
        model: { include: { brand: true } },
      },
    });
    if (!vehicle) throw new AppError('Vehicle unit not found', 404);

    const workOrders = await prisma.workOrder.findMany({
      where: { vehicleUnitId },
      include: {
        customer: true,
        branch: true,
        receptionEmployee: { select: { firstNameEn: true, lastNameEn: true } },
        assignedTechnician: { select: { firstNameEn: true, lastNameEn: true } },
        items: { include: { product: true, technician: true } },
        odometerHistories: true,
        invoice: { include: { payments: true } },
      },
      orderBy: { receptionDate: 'desc' },
    });

    return {
      vehicle,
      history: workOrders,
    };
  }

  async getCustomerServiceHistory(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError('Customer not found', 404);

    const workOrders = await prisma.workOrder.findMany({
      where: { customerId },
      include: {
        vehicleUnit: {
          include: {
            product: true,
            model: { include: { brand: true } },
          },
        },
        branch: true,
        items: { include: { product: true } },
        invoice: { include: { payments: true } },
      },
      orderBy: { receptionDate: 'desc' },
    });

    return {
      customer,
      history: workOrders,
    };
  }

  /**
   * Get all vehicles registered/owned by a specific customer:
   * Combines CustomerOwnership records and previous WorkOrders for this customer.
   */
  async getCustomerVehicles(customerId: string) {
    // 1. Get vehicles from CustomerOwnership
    const ownerships = await prisma.customerOwnership.findMany({
      where: { customerId },
      include: {
        vehicleUnit: {
          include: {
            product: { include: { brand: true, category: true } },
            model: true,
            branch: true,
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Also get vehicles from historical WorkOrders for this customer
    const workOrders = await prisma.workOrder.findMany({
      where: { customerId },
      select: {
        vehicleUnit: {
          include: {
            product: { include: { brand: true, category: true } },
            model: true,
            branch: true,
            warehouse: true,
          },
        },
      },
      orderBy: { receptionDate: 'desc' },
    });

    const vehicleMap = new Map<string, any>();

    ownerships.forEach((o) => {
      if (o.vehicleUnit) {
        vehicleMap.set(o.vehicleUnit.id, {
          ...o.vehicleUnit,
          plateNumber: o.plateNumber || '',
          source: 'OWNERSHIP',
        });
      }
    });

    workOrders.forEach((wo) => {
      if (wo.vehicleUnit && !vehicleMap.has(wo.vehicleUnit.id)) {
        vehicleMap.set(wo.vehicleUnit.id, {
          ...wo.vehicleUnit,
          source: 'SERVICE_HISTORY',
        });
      }
    });

    return Array.from(vehicleMap.values());
  }

  /**
   * Directly link/register a vehicle to a customer in CustomerOwnership
   */
  async linkCustomerVehicle(customerId: string, vehicleUnitId: string, plateNumber?: string, notes?: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError('Customer not found', 404);

    const vehicle = await prisma.vehicleUnit.findUnique({ where: { id: vehicleUnitId } });
    if (!vehicle) throw new AppError('Vehicle unit not found', 404);

    // Upsert or create CustomerOwnership
    const existing = await prisma.customerOwnership.findFirst({
      where: { customerId, vehicleUnitId },
    });

    if (existing) {
      if (plateNumber && existing.plateNumber !== plateNumber) {
        return prisma.customerOwnership.update({
          where: { id: existing.id },
          data: { plateNumber },
        });
      }
      return existing;
    }

    return prisma.customerOwnership.create({
      data: {
        customerId,
        vehicleUnitId,
        plateNumber: plateNumber || null,
        notes: notes || 'Registered via workshop vehicle reception',
      },
    });
  }
}
