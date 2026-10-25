import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ProductsService } from './products.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { createProductSchema, updateProductSchema } from '@erp/shared';

const service = new ProductsService();

export class ProductsController {
  async list(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const categoryId = req.query.categoryId as string;
    const brandId = req.query.brandId as string;

    const { total, data } = await service.list(req.user!.organizationId, {
      skip,
      limit,
      search,
      type,
      categoryId,
      brandId,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const product = await service.getById(req.params.id as string);
    sendSuccess(res, product);
  }

  async getByBarcode(req: AuthenticatedRequest, res: Response) {
    const product = await service.getByBarcode(req.params.barcode as string, req.user!.organizationId);
    sendSuccess(res, product);
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const data = createProductSchema.parse(req.body);
    const product = await service.create(data, req.user!.organizationId, req.user!.userId);
    sendSuccess(res, product, 201);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const data = updateProductSchema.parse(req.body);
    const product = await service.update(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, product);
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    await service.delete(req.params.id as string, req.user!.userId);
    sendSuccess(res, { message: 'Product deleted successfully' });
  }
}
