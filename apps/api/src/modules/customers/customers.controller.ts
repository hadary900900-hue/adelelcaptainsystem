import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CustomersService } from './customers.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { createCustomerSchema, updateCustomerSchema, createCustomerNoteSchema } from '@erp/shared';

const service = new CustomersService();

export class CustomersController {
  async list(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const priceTier = req.query.priceTier as string;

    const { total, data } = await service.list(req.user!.organizationId, {
      skip,
      limit,
      search,
      type,
      priceTier,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const customer = await service.getById(req.params.id as string);
    sendSuccess(res, customer);
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const data = createCustomerSchema.parse(req.body);
    const customer = await service.create(req.user!.organizationId, data, req.user!.userId);
    sendSuccess(res, customer, 201);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const data = updateCustomerSchema.parse(req.body);
    const updated = await service.update(req.params.id as string, data, req.user!.userId);
    sendSuccess(res, updated, 'Customer updated successfully');
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    await service.delete(req.params.id as string, req.user!.userId);
    sendSuccess(res, { message: 'Customer deleted successfully' });
  }

  async addNote(req: AuthenticatedRequest, res: Response) {
    const data = createCustomerNoteSchema.parse(req.body);
    const note = await service.addNote(req.params.id as string, data.note, req.user!.userId);
    sendSuccess(res, note, 201);
  }

  async getStatement(req: AuthenticatedRequest, res: Response) {
    const statement = await service.getStatement(req.params.id as string);
    sendSuccess(res, statement);
  }
}
