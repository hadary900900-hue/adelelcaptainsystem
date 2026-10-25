import { Response, NextFunction } from 'express';
import { RolesService } from './roles.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';

const service = new RolesService();

export class RolesController {
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

  async getPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const permissions = await service.getAllPermissions();
      sendSuccess(res, permissions);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const role = await service.getById(req.params.id as string);
      sendSuccess(res, role);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const role = await service.create(req.user!.organizationId, req.body, req.user!.userId);
      sendSuccess(res, role, 'Role created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const role = await service.update(req.params.id as string, req.body, req.user!.userId);
      sendSuccess(res, role, 'Role updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await service.delete(req.params.id as string, req.user!.userId);
      sendSuccess(res, null, 'Role deleted');
    } catch (error) {
      next(error);
    }
  }
}
