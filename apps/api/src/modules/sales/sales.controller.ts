import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { SalesService } from './sales.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import {
  createQuotationSchema,
  createSalesOrderSchema,
  createSalesInvoiceSchema,
  createSalesReturnSchema,
  createCustomerPaymentSchema,
} from '@erp/shared';

const service = new SalesService();

export class SalesController {
  // Quotations
  async listQuotations(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const branchId = req.query.branchId as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const { total, data } = await service.listQuotations(req.user!.organizationId, {
      skip,
      limit,
      branchId,
      status,
      search,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getQuotationById(req: AuthenticatedRequest, res: Response) {
    const quote = await service.getQuotationById(req.params.id as string);
    sendSuccess(res, quote);
  }

  async createQuotation(req: AuthenticatedRequest, res: Response) {
    const data = createQuotationSchema.parse(req.body);
    const quote = await service.createQuotation(req.user!.organizationId, data, req.user!.userId);
    sendSuccess(res, quote, 201);
  }

  // Orders
  async listOrders(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const branchId = req.query.branchId as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const { total, data } = await service.listOrders(req.user!.organizationId, {
      skip,
      limit,
      branchId,
      status,
      search,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getOrderById(req: AuthenticatedRequest, res: Response) {
    const order = await service.getOrderById(req.params.id as string);
    sendSuccess(res, order);
  }

  async createOrder(req: AuthenticatedRequest, res: Response) {
    const data = createSalesOrderSchema.parse(req.body);
    const order = await service.createOrder(req.user!.organizationId, data, req.user!.userId);
    sendSuccess(res, order, 201);
  }

  // Invoices
  async listInvoices(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const branchId = req.query.branchId as string;
    const invoiceType = req.query.invoiceType as string;
    const paymentStatus = req.query.paymentStatus as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const { total, data } = await service.listInvoices(req.user!.organizationId, {
      skip,
      limit,
      branchId,
      invoiceType,
      paymentStatus,
      search,
      startDate,
      endDate,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async getInvoiceById(req: AuthenticatedRequest, res: Response) {
    const invoice = await service.getInvoiceById(req.params.id as string);
    sendSuccess(res, invoice);
  }

  async createInvoice(req: AuthenticatedRequest, res: Response) {
    const data = createSalesInvoiceSchema.parse(req.body);
    const invoice = await service.createInvoice(req.user!.organizationId, data, req.user!.userId);
    sendSuccess(res, invoice, 201);
  }

  async updateInvoice(req: AuthenticatedRequest, res: Response) {
    const invoice = await service.updateInvoice(req.params.id as string, req.body, req.user!.userId);
    sendSuccess(res, invoice, 'Invoice updated successfully');
  }

  // Returns
  async listReturns(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const branchId = req.query.branchId as string;
    const search = req.query.search as string;

    const { total, data } = await service.listReturns(req.user!.organizationId, {
      skip,
      limit,
      branchId,
      search,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async createReturn(req: AuthenticatedRequest, res: Response) {
    const data = createSalesReturnSchema.parse(req.body);
    const salesReturn = await service.createReturn(req.user!.organizationId, data, req.user!.userId);
    sendSuccess(res, salesReturn, 201);
  }

  // Payments
  async createPayment(req: AuthenticatedRequest, res: Response) {
    const data = createCustomerPaymentSchema.parse(req.body);
    const payment = await service.createPayment(data, req.user!.userId);
    sendSuccess(res, payment, 201);
  }

  async cancelPayment(req: AuthenticatedRequest, res: Response) {
    const result = await service.cancelCustomerPayment(req.params.id as string, req.user!.userId);
    sendSuccess(res, result);
  }

  // Stock Goods Issue Reversal & Protected Deletion
  async cancelGoodsIssue(req: AuthenticatedRequest, res: Response) {
    const result = await service.cancelInvoiceGoodsIssue(req.params.id as string, req.user!.userId);
    sendSuccess(res, result);
  }

  async deleteInvoice(req: AuthenticatedRequest, res: Response) {
    const result = await service.deleteInvoice(req.params.id as string, req.user!.userId);
    sendSuccess(res, result);
  }

  // Dashboard
  async getDashboard(req: AuthenticatedRequest, res: Response) {
    const branchId = req.query.branchId as string;
    const data = await service.getSalesDashboard(req.user!.organizationId, branchId);
    sendSuccess(res, data);
  }
}
