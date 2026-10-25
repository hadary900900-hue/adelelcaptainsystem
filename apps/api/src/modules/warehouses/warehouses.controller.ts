import { Response, NextFunction } from 'express';
import { WarehousesService } from './warehouses.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';

const service = new WarehousesService();

export class WarehousesController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req.query);
      const branchId = req.query.branchId as string | undefined;
      const result = await service.list(req.user!.organizationId, pagination, branchId);
      
      sendPaginated(res, result.data, {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.limit)
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const warehouse = await service.getById(req.params.id as string);
      sendSuccess(res, warehouse);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const warehouse = await service.create(req.body, req.user!.userId);
      sendSuccess(res, warehouse, 'Warehouse created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const warehouse = await service.update(req.params.id as string, req.body, req.user!.userId);
      sendSuccess(res, warehouse, 'Warehouse updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await service.delete(req.params.id as string, req.user!.userId);
      sendSuccess(res, null, 'Warehouse deleted');
    } catch (error) {
      next(error);
    }
  }
}
