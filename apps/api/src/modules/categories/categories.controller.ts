import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CategoriesService } from './categories.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { createCategorySchema, updateCategorySchema } from '@erp/shared';

const service = new CategoriesService();

export class CategoriesController {
  async list(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const { total, data } = await service.list(req.user!.organizationId, { skip, limit, search });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const category = await service.getById(req.params.id as string);
    sendSuccess(res, category);
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const data = createCategorySchema.parse(req.body);
    const category = await service.create(data, req.user!.organizationId, req.user!.userId);
    sendSuccess(res, category, 201);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const data = updateCategorySchema.parse(req.body);
    const category = await service.update(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, category);
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    await service.delete(req.params.id as string, req.user!.userId);
    sendSuccess(res, { message: 'Category deleted successfully' });
  }
}
