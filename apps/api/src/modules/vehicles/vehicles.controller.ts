import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { VehiclesService } from './vehicles.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { createVehicleUnitSchema, updateVehicleUnitSchema } from '@erp/shared';

const service = new VehiclesService();

export class VehiclesController {
  async list(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const branchId = req.query.branchId as string;
    const warehouseId = req.query.warehouseId as string;
    const productId = req.query.productId as string;

    const { total, data } = await service.list(req.user!.organizationId, {
      skip,
      limit,
      search,
      status,
      branchId,
      warehouseId,
      productId,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const unit = await service.getById(req.params.id as string);
    sendSuccess(res, unit);
  }

  async getByVin(req: AuthenticatedRequest, res: Response) {
    const unit = await service.getByVin(req.params.vin as string);
    sendSuccess(res, unit);
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const data = createVehicleUnitSchema.parse(req.body);
    const unit = await service.create(data, req.user!.userId);
    sendSuccess(res, unit, 201);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const data = updateVehicleUnitSchema.parse(req.body);
    const unit = await service.update(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, unit);
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    await service.delete(req.params.id as string, req.user!.userId);
    sendSuccess(res, { message: 'Vehicle unit deleted successfully' });
  }
}
