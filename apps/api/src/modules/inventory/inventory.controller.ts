import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { InventoryService } from './inventory.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { createStockTransferSchema, createStockAdjustmentSchema, createStockCountSchema } from '@erp/shared';

const service = new InventoryService();

export class InventoryController {
  async getStockBalances(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const warehouseId = req.query.warehouseId as string;
    const productId = req.query.productId as string;
    const search = req.query.search as string;

    const { total, data } = await service.getStockBalances(req.user!.organizationId, {
      warehouseId,
      productId,
      search,
      skip,
      limit,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getMovements(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const warehouseId = req.query.warehouseId as string;
    const productId = req.query.productId as string;
    const type = req.query.type as string;
    const search = req.query.search as string;

    const { total, data } = await service.getMovements(req.user!.organizationId, {
      warehouseId,
      productId,
      type,
      search,
      skip,
      limit,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async listTransfers(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const { total, data } = await service.listTransfers(req.user!.organizationId, { skip, limit, status });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async createTransfer(req: AuthenticatedRequest, res: Response) {
    const data = createStockTransferSchema.parse(req.body);
    const transfer = await service.createTransfer(data, req.user!.userId);
    sendSuccess(res, transfer, 201);
  }

  async acceptTransfer(req: AuthenticatedRequest, res: Response) {
    const transfer = await service.acceptTransfer(req.params.id as string, req.user!.userId, req.user?.permissions || []);
    sendSuccess(res, transfer, 'Transfer accepted and inventory updated successfully');
  }

  async cancelTransfer(req: AuthenticatedRequest, res: Response) {
    const transfer = await service.cancelTransfer(req.params.id as string, req.user!.userId);
    sendSuccess(res, transfer, 'Transfer cancelled successfully');
  }

  async listAdjustments(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { total, data } = await service.listAdjustments(req.user!.organizationId, { skip, limit });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async createAdjustment(req: AuthenticatedRequest, res: Response) {
    const data = createStockAdjustmentSchema.parse(req.body);
    const adjustment = await service.createAdjustment(data, req.user!.userId);
    sendSuccess(res, adjustment, 201);
  }

  async listCounts(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { total, data } = await service.listCounts(req.user!.organizationId, { skip, limit });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async createCount(req: AuthenticatedRequest, res: Response) {
    const data = createStockCountSchema.parse(req.body);
    const count = await service.createCount(data, req.user!.userId);
    sendSuccess(res, count, 201);
  }

  async updateStockBalance(req: AuthenticatedRequest, res: Response) {
    const updated = await service.updateStockBalance(req.params.id as string, req.body, req.user!.userId);
    sendSuccess(res, updated, 'Stock balance updated successfully');
  }

  async deleteStockBalance(req: AuthenticatedRequest, res: Response) {
    await service.deleteStockBalance(req.params.id as string, req.user!.userId);
    sendSuccess(res, { message: 'Stock balance deleted successfully' });
  }

  async getVehicleUnits(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const branchId = req.query.branchId as string;
    const warehouseId = req.query.warehouseId as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const { total, data } = await service.getVehicleUnits(req.user!.organizationId, {
      branchId,
      warehouseId,
      status,
      search,
      skip,
      limit,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  // ==================== STOCK ORDERS ====================

  async listStockOrders(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const branchId = req.query.branchId as string;
    const { total, data } = await service.listStockOrders(req.user!.organizationId, { skip, limit, status, branchId });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async createStockOrder(req: AuthenticatedRequest, res: Response) {
    const order = await service.createStockOrder(req.body, req.user!.userId, req.user!.organizationId);
    sendSuccess(res, order, 'Stock order created', 201);
  }

  async confirmStockOrder(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const action = req.body.action as 'CONFIRMED' | 'REJECTED';
    if (!['CONFIRMED', 'REJECTED'].includes(action)) throw new Error('Invalid action');
    const order = await service.confirmStockOrder(id, req.user!.userId, action);
    sendSuccess(res, order, `Stock order ${action.toLowerCase()}`);
  }

  async getLowStockItems(req: AuthenticatedRequest, res: Response) {
    const warehouseId = req.query.warehouseId as string;
    const branchId = req.query.branchId as string;
    const threshold = req.query.threshold as string;
    const data = await service.getLowStockItems(req.user!.organizationId, { warehouseId, branchId, threshold });
    sendSuccess(res, data);
  }
}
