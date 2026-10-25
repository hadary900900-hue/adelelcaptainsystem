import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class CrmService {
  // --- LEADS ---
  async listLeads(orgId: string, { skip, limit, status, source, assignedToId, search }: any) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignedTo: { select: { id: true, firstNameEn: true, lastNameEn: true } },
          customer: { select: { id: true, customerCode: true, nameEn: true, nameAr: true } },
          _count: { select: { activities: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, data };
  }

  async getLeadById(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, firstNameEn: true, lastNameEn: true } },
        customer: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstNameEn: true, lastNameEn: true } } }
        }
      }
    });
    if (!lead) throw new AppError('Lead not found', 404);
    return lead;
  }

  async createLead(orgId: string, data: any, userId: string) {
    const lead = await prisma.lead.create({
      data: {
        ...data,
        nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : null,
        organizationId: orgId,
        createdById: userId,
      }
    });

    createAuditLog({
      userId,
      entityType: 'Lead',
      entityId: lead.id,
      action: 'create',
      afterData: lead,
    });

    return lead;
  }

  async updateLead(id: string, data: any, userId: string) {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new AppError('Lead not found', 404);

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        nextFollowUp: data.nextFollowUp !== undefined ? (data.nextFollowUp ? new Date(data.nextFollowUp) : null) : undefined,
      }
    });

    createAuditLog({
      userId,
      entityType: 'Lead',
      entityId: id,
      action: 'update',
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  async deleteLead(id: string, userId: string) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new AppError('Lead not found', 404);

    await prisma.$transaction(async (tx) => {
      await tx.salesActivity.deleteMany({ where: { leadId: id } });
      await tx.lead.delete({ where: { id } });
    });

    createAuditLog({
      userId,
      entityType: 'Lead',
      entityId: id,
      action: 'delete',
      beforeData: lead,
    });
  }

  // --- ACTIVITIES ---
  async listActivities({ leadId, customerId, userId, status }: any) {
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (customerId) where.customerId = customerId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    return prisma.salesActivity.findMany({
      where,
      include: {
        user: { select: { firstNameEn: true, lastNameEn: true } },
        lead: { select: { id: true, title: true, contactName: true } },
        customer: { select: { id: true, nameEn: true, phone: true } },
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  async createActivity(data: any, userId: string) {
    return prisma.salesActivity.create({
      data: {
        ...data,
        userId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: { user: { select: { firstNameEn: true, lastNameEn: true } } }
    });
  }

  async updateActivity(id: string, data: any) {
    return prisma.salesActivity.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      }
    });
  }

  async deleteActivity(id: string) {
    return prisma.salesActivity.delete({ where: { id } });
  }

  // --- RESERVATIONS ---
  async listReservations(orgId: string, { branchId, status }: any) {
    const where: any = {
      branch: { organizationId: orgId }
    };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    return prisma.vehicleReservation.findMany({
      where,
      include: {
        customer: true,
        vehicleUnit: { include: { product: true } },
        branch: true,
        warehouse: true,
        createdBy: { select: { firstNameEn: true, lastNameEn: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createReservation(data: any, userId: string) {
    // Check vehicle status
    const unit = await prisma.vehicleUnit.findUnique({
      where: { id: data.vehicleUnitId },
      include: { warehouse: true }
    });

    if (!unit) throw new AppError('Vehicle unit not found', 404);
    if (unit.status !== 'AVAILABLE') {
      throw new AppError(`Cannot reserve vehicle. Unit is currently ${unit.status}`, 400);
    }
    if (unit.warehouseId !== data.warehouseId) {
      throw new AppError('Vehicle is not located in the selected warehouse', 400);
    }

    return prisma.$transaction(async (tx) => {
      const reservationNo = `RES-${Date.now()}`;
      const reservation = await tx.vehicleReservation.create({
        data: {
          reservationNo,
          branchId: data.branchId,
          warehouseId: data.warehouseId,
          customerId: data.customerId,
          vehicleUnitId: data.vehicleUnitId,
          productId: data.productId,
          depositAmount: data.depositAmount || 0,
          totalPrice: data.totalPrice,
          expiresAt: new Date(data.expiresAt),
          notes: data.notes,
          createdById: userId,
        }
      });

      // Mark vehicle unit as RESERVED
      await tx.vehicleUnit.update({
        where: { id: data.vehicleUnitId },
        data: { status: 'RESERVED' }
      });

      createAuditLog({
        userId,
        branchId: data.branchId,
        entityType: 'VehicleReservation',
        entityId: reservation.id,
        action: 'create',
        afterData: reservation,
      });

      return reservation;
    });
  }

  async cancelReservation(id: string, userId: string) {
    const res = await prisma.vehicleReservation.findUnique({ where: { id } });
    if (!res) throw new AppError('Reservation not found', 404);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleReservation.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      // Revert vehicle to AVAILABLE if it was reserved
      await tx.vehicleUnit.update({
        where: { id: res.vehicleUnitId },
        data: { status: 'AVAILABLE' }
      });

      createAuditLog({
        userId,
        branchId: res.branchId,
        entityType: 'VehicleReservation',
        entityId: id,
        action: 'cancel',
      });

      return updated;
    });
  }
}
