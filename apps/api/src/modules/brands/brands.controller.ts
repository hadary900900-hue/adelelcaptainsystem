import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { BrandsService } from './brands.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { createBrandSchema, updateBrandSchema, createVehicleModelSchema } from '@erp/shared';

const service = new BrandsService();

export class BrandsController {
  async list(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const { total, data } = await service.list(req.user!.organizationId, { skip, limit, search });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const brand = await service.getById(req.params.id as string);
    sendSuccess(res, brand);
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const data = createBrandSchema.parse(req.body);
    const brand = await service.create(data, req.user!.organizationId, req.user!.userId);
    sendSuccess(res, brand, 201);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const data = updateBrandSchema.parse(req.body);
    const brand = await service.update(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, brand);
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    await service.delete(req.params.id as string, req.user!.userId);
    sendSuccess(res, { message: 'Brand deleted successfully' });
  }

  async listModels(req: AuthenticatedRequest, res: Response) {
    const models = await service.listModels(req.params.id as string);
    sendSuccess(res, models);
  }

  async createModel(req: AuthenticatedRequest, res: Response) {
    const data = createVehicleModelSchema.parse(req.body);
    const model = await service.createModel(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, model, 201);
  }
}
