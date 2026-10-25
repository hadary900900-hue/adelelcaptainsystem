import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { WorkshopService } from './workshop.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  addWorkOrderItemSchema,
  completeWorkOrderSchema,
  deliverVehicleSchema,
} from '@erp/shared';

const service = new WorkshopService();

export class WorkshopController {
  async listWorkOrders(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const branchId = req.query.branchId as string;
    const status = req.query.status as string;
    const customerId = req.query.customerId as string;
    const vehicleUnitId = req.query.vehicleUnitId as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const { total, data } = await service.listWorkOrders(req.user!.organizationId, {
      skip,
      limit,
      branchId,
      status,
      customerId,
      vehicleUnitId,
      search,
      startDate,
      endDate,
    });

    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getWorkOrderById(req: AuthenticatedRequest, res: Response) {
    const wo = await service.getWorkOrderById(req.params.id as string);
    sendSuccess(res, wo);
  }

  async createReception(req: AuthenticatedRequest, res: Response) {
    const data = createWorkOrderSchema.parse(req.body);
    const wo = await service.createReception(
      req.user!.organizationId,
      data,
      req.user!.userId,
      req.user?.permissions || []
    );
    sendSuccess(res, wo, 201);
  }

  async updateWorkOrder(req: AuthenticatedRequest, res: Response) {
    const data = updateWorkOrderSchema.parse(req.body);
    const wo = await service.updateWorkOrder(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, wo);
  }

  async addWorkOrderItem(req: AuthenticatedRequest, res: Response) {
    const data = addWorkOrderItemSchema.parse(req.body);
    const item = await service.addWorkOrderItem(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, item, 201);
  }

  async removeWorkOrderItem(req: AuthenticatedRequest, res: Response) {
    const result = await service.removeWorkOrderItem(req.params.itemId as string, req.user!.userId);
    sendSuccess(res, result);
  }

  async completeAndGenerateInvoice(req: AuthenticatedRequest, res: Response) {
    const data = completeWorkOrderSchema.parse(req.body);
    const invoice = await service.completeAndGenerateInvoice(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, invoice, 'Work order completed and invoice generated successfully');
  }

  async deliverVehicle(req: AuthenticatedRequest, res: Response) {
    const data = deliverVehicleSchema.parse(req.body);
    const wo = await service.deliverVehicle(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, wo, 'Vehicle delivered and handover recorded successfully');
  }

  async getVehicleHistory(req: AuthenticatedRequest, res: Response) {
    const data = await service.getVehicleServiceHistory(req.params.vehicleUnitId as string);
    sendSuccess(res, data);
  }

  async getCustomerHistory(req: AuthenticatedRequest, res: Response) {
    const data = await service.getCustomerServiceHistory(req.params.customerId as string);
    sendSuccess(res, data);
  }

  async getCustomerVehicles(req: AuthenticatedRequest, res: Response) {
    const data = await service.getCustomerVehicles(req.params.customerId as string);
    sendSuccess(res, data);
  }

  async linkCustomerVehicle(req: AuthenticatedRequest, res: Response) {
    const { vehicleUnitId, plateNumber, notes } = req.body;
    const data = await service.linkCustomerVehicle(req.params.customerId as string, vehicleUnitId, plateNumber, notes);
    sendSuccess(res, data, 201);
  }
}
