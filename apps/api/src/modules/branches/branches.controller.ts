import { Response, NextFunction } from 'express';
import { BranchesService } from './branches.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';

const service = new BranchesService();

export class BranchesController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req.query);
      const result = await service.list(req.user!.organizationId, pagination);
      
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
      const branch = await service.getById(req.params.id as string);
      sendSuccess(res, branch);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const branch = await service.create(req.user!.organizationId, req.body, req.user!.userId);
      sendSuccess(res, branch, 'Branch created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const branch = await service.update(req.params.id as string, req.body, req.user!.userId);
      sendSuccess(res, branch, 'Branch updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await service.delete(req.params.id as string, req.user!.userId);
      sendSuccess(res, null, 'Branch deleted');
    } catch (error) {
      next(error);
    }
  }
}
