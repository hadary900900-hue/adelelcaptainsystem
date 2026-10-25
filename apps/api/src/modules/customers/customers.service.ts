import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class CustomersService {
  async list(orgId: string, { skip, limit, search, type, priceTier }: any) {
    const where: any = { organizationId: orgId };
    if (type) where.type = type;
    if (priceTier) where.priceTier = priceTier;
    if (search) {
      where.OR = [
        { customerCode: { contains: search } },
        { nameEn: { contains: search } },
        { nameAr: { contains: search } },
        { companyName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { invoices: true, orders: true, quotations: true, ownerships: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, data };
  }

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        ownerships: {
          include: {
            vehicleUnit: {
              include: { product: true, model: { include: { brand: true } } }
            }
          }
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: true } } }
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        quotations: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        notesHistory: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstNameEn: true, lastNameEn: true } } }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstNameEn: true, lastNameEn: true } } }
        }
      }
    });

    if (!customer) throw new AppError('Customer not found', 404);
    return customer;
  }

  async create(orgId: string, data: any, userId: string) {
    const exists = await prisma.customer.findFirst({
      where: { organizationId: orgId, customerCode: data.customerCode }
    });
    if (exists) throw new AppError('Customer code already exists', 400);

    const customer = await prisma.customer.create({
      data: {
        ...data,
        organizationId: orgId,
      }
    });

    createAuditLog({
      userId,
      entityType: 'Customer',
      entityId: customer.id,
      action: 'create',
      afterData: customer,
    });

    return customer;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Customer not found', 404);

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });

    createAuditLog({
      userId,
      entityType: 'Customer',
      entityId: id,
      action: 'update',
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { invoices: true, orders: true } }
      }
    });
    if (!customer) throw new AppError('Customer not found', 404);

    if (customer._count.invoices > 0 || customer._count.orders > 0) {
      throw new AppError('Cannot delete customer with historical invoices or sales orders', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.customerNote.deleteMany({ where: { customerId: id } });
      await tx.salesActivity.deleteMany({ where: { customerId: id } });
      await tx.salesQuotation.deleteMany({ where: { customerId: id } });
      await tx.customer.delete({ where: { id } });
    });

    createAuditLog({
      userId,
      entityType: 'Customer',
      entityId: id,
      action: 'delete',
      beforeData: customer,
    });
  }

  async addNote(customerId: string, note: string, userId: string) {
    return prisma.customerNote.create({
      data: {
        customerId,
        userId,
        note,
      },
      include: { user: { select: { firstNameEn: true, lastNameEn: true } } }
    });
  }

  async getStatement(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { invoiceDate: 'asc' },
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            grandTotal: true,
            paidAmount: true,
            balanceDue: true,
            invoiceType: true,
            paymentStatus: true,
          }
        },
        payments: {
          orderBy: { paymentDate: 'asc' },
          select: {
            id: true,
            paymentNo: true,
            paymentDate: true,
            amount: true,
            paymentMethod: true,
            referenceNo: true,
            status: true,
          }
        }
      }
    });

    if (!customer) throw new AppError('Customer not found', 404);

    // Merge invoices & payments into sorted ledger
    const ledger = [
      ...customer.invoices.map(inv => ({
        type: 'INVOICE',
        ref: inv.invoiceNo,
        date: inv.invoiceDate,
        debit: inv.grandTotal,
        credit: 0,
        status: inv.paymentStatus,
        details: inv.invoiceType
      })),
      ...customer.payments.map(pay => ({
        type: 'PAYMENT',
        ref: pay.paymentNo,
        date: pay.paymentDate,
        debit: 0,
        credit: pay.amount,
        status: pay.status,
        details: pay.paymentMethod
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const items = ledger.map(entry => {
      runningBalance += (entry.debit - entry.credit);
      return {
        ...entry,
        runningBalance,
      };
    });

    return {
      customer: {
        id: customer.id,
        code: customer.customerCode,
        nameEn: customer.nameEn,
        nameAr: customer.nameAr,
        phone: customer.phone,
        creditLimit: customer.creditLimit,
        currentBalance: customer.currentBalance,
      },
      ledger: items,
      totalDebit: customer.invoices.reduce((sum, i) => sum + i.grandTotal, 0),
      totalCredit: customer.payments.reduce((sum, p) => sum + p.amount, 0),
    };
  }
}
