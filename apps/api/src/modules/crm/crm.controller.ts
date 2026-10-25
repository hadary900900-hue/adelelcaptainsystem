import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CrmService } from './crm.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import {
  createLeadSchema,
  updateLeadSchema,
  createSalesActivitySchema,
  updateSalesActivitySchema,
  createVehicleReservationSchema,
} from '@erp/shared';

const service = new CrmService();

export class CrmController {
  // Leads
  async listLeads(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const source = req.query.source as string;
    const assignedToId = req.query.assignedToId as string;
    const search = req.query.search as string;

    const { total, data } = await service.listLeads(req.user!.organizationId, {
      skip,
      limit,
      status,
      source,
      assignedToId,
      search,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getLeadById(req: AuthenticatedRequest, res: Response) {
    const lead = await service.getLeadById(req.params.id as string);
    sendSuccess(res, lead);
  }

  async createLead(req: AuthenticatedRequest, res: Response) {
    const data = createLeadSchema.parse(req.body);
    const lead = await service.createLead(req.user!.organizationId, data, req.user!.userId);
    sendSuccess(res, lead, 201);
  }

  async updateLead(req: AuthenticatedRequest, res: Response) {
    const data = updateLeadSchema.parse(req.body);
    const updated = await service.updateLead(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, updated, 'Lead updated successfully');
  }

  async deleteLead(req: AuthenticatedRequest, res: Response) {
    await service.deleteLead(req.params.id as string, req.user!.userId);
    sendSuccess(res, { message: 'Lead deleted successfully' });
  }

  // Activities
  async listActivities(req: AuthenticatedRequest, res: Response) {
    const activities = await service.listActivities({
      leadId: req.query.leadId as string,
      customerId: req.query.customerId as string,
      userId: req.query.userId as string,
      status: req.query.status as string,
    });
    sendSuccess(res, activities);
  }

  async createActivity(req: AuthenticatedRequest, res: Response) {
    const data = createSalesActivitySchema.parse(req.body);
    const activity = await service.createActivity(data, req.user!.userId);
    sendSuccess(res, activity, 201);
  }

  async updateActivity(req: AuthenticatedRequest, res: Response) {
    const data = updateSalesActivitySchema.parse(req.body);
    const updated = await service.updateActivity(req.params.id as string, data);
    sendSuccess(res, updated, 'Activity updated successfully');
  }

  async deleteActivity(req: AuthenticatedRequest, res: Response) {
    await service.deleteActivity(req.params.id as string);
    sendSuccess(res, { message: 'Activity deleted successfully' });
  }

  // Reservations
  async listReservations(req: AuthenticatedRequest, res: Response) {
    const reservations = await service.listReservations(req.user!.organizationId, {
      branchId: req.query.branchId as string,
      status: req.query.status as string,
    });
    sendSuccess(res, reservations);
  }

  async createReservation(req: AuthenticatedRequest, res: Response) {
    const data = createVehicleReservationSchema.parse(req.body);
    const reservation = await service.createReservation(data, req.user!.userId);
    sendSuccess(res, reservation, 201);
  }

  async cancelReservation(req: AuthenticatedRequest, res: Response) {
    const cancelled = await service.cancelReservation(req.params.id as string, req.user!.userId);
    sendSuccess(res, cancelled, 'Reservation cancelled and vehicle released');
  }
}
