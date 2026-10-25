import { Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';

const service = new UsersService();

export class UsersController {
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
      const user = await service.getById(req.params.id as string);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await service.create(req.user!.organizationId, req.body, req.user!.userId);
      sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await service.update(req.params.id as string, req.body, req.user!.userId);
      sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await service.delete(req.params.id as string, req.user!.userId);
      sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.body;
      await service.toggleActive(req.params.id as string, isActive, req.user!.userId);
      sendSuccess(res, null, 'User status updated');
    } catch (error) {
      next(error);
    }
  }

  async getUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.getUserPermissions(req.params.id as string);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async updateUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await service.updateUserPermissions(
        req.params.id as string,
        req.body.permissions,
        req.user!.userId
      );
      sendSuccess(res, data, 'User permissions updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
