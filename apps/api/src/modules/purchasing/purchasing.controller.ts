import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { PurchasingService } from './purchasing.service';
import { sendSuccess } from '../../utils/response';

const service = new PurchasingService();

export class PurchasingController {
  // Categories
  async listCategories(req: AuthenticatedRequest, res: Response) {
    const data = await service.listSupplierCategories(req.user!.organizationId);
    sendSuccess(res, data);
  }

  async createCategory(req: AuthenticatedRequest, res: Response) {
    const data = await service.createSupplierCategory(req.user!.organizationId, req.body);
    sendSuccess(res, data, 201);
  }

  // Suppliers
  async listSuppliers(req: AuthenticatedRequest, res: Response) {
    const { skip, limit, search, categoryId, isActive } = req.query;
    const data = await service.listSuppliers(req.user!.organizationId, {
      skip: skip ? parseInt(skip as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      categoryId: categoryId as string,
      isActive,
    });
    sendSuccess(res, data);
  }

  async getSupplierById(req: AuthenticatedRequest, res: Response) {
    const data = await service.getSupplierById(req.params.id as string);
    sendSuccess(res, data);
  }

  async createSupplier(req: AuthenticatedRequest, res: Response) {
    const data = await service.createSupplier(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  async updateSupplier(req: AuthenticatedRequest, res: Response) {
    const data = await service.updateSupplier(req.params.id as string, req.body, req.user!.userId);
    sendSuccess(res, data);
  }

  async getSupplierStatement(req: AuthenticatedRequest, res: Response) {
    const { startDate, endDate } = req.query;
    const data = await service.getSupplierStatement(req.params.id as string, { startDate, endDate });
    sendSuccess(res, data);
  }

  // Purchase Quotations
  async listQuotations(req: AuthenticatedRequest, res: Response) {
    const { skip, limit, branchId, supplierId, status, search } = req.query;
    const data = await service.listPurchaseQuotations(req.user!.organizationId, {
      skip: skip ? parseInt(skip as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      branchId: branchId as string,
      supplierId: supplierId as string,
      status: status as string,
      search: search as string,
    });
    sendSuccess(res, data);
  }

  async createQuotation(req: AuthenticatedRequest, res: Response) {
    const data = await service.createPurchaseQuotation(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  // Purchase Orders
  async listOrders(req: AuthenticatedRequest, res: Response) {
    const { skip, limit, branchId, supplierId, status, search } = req.query;
    const data = await service.listPurchaseOrders(req.user!.organizationId, {
      skip: skip ? parseInt(skip as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      branchId: branchId as string,
      supplierId: supplierId as string,
      status: status as string,
      search: search as string,
    });
    sendSuccess(res, data);
  }

  async createOrder(req: AuthenticatedRequest, res: Response) {
    const data = await service.createPurchaseOrder(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  // Goods Receipt
  async listGoodsReceipts(req: AuthenticatedRequest, res: Response) {
    const { skip, limit, branchId, warehouseId, supplierId, search } = req.query;
    const data = await service.listGoodsReceipts(req.user!.organizationId, {
      skip: skip ? parseInt(skip as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      branchId: branchId as string,
      warehouseId: warehouseId as string,
      supplierId: supplierId as string,
      search: search as string,
    });
    sendSuccess(res, data);
  }

  async createGoodsReceipt(req: AuthenticatedRequest, res: Response) {
    const data = await service.createGoodsReceipt(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  // Purchase Invoices
  async listInvoices(req: AuthenticatedRequest, res: Response) {
    const { skip, limit, branchId, warehouseId, supplierId, paymentStatus, search, startDate, endDate } = req.query;
    const data = await service.listPurchaseInvoices(req.user!.organizationId, {
      skip: skip ? parseInt(skip as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      branchId: branchId as string,
      warehouseId: warehouseId as string,
      supplierId: supplierId as string,
      paymentStatus: paymentStatus as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  }

  async createInvoice(req: AuthenticatedRequest, res: Response) {
    const data = await service.createPurchaseInvoice(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  async updateInvoice(req: AuthenticatedRequest, res: Response) {
    const data = await service.updatePurchaseInvoice(req.params.id as string, req.body, req.user!.userId);
    sendSuccess(res, data);
  }

  async getInvoiceById(req: AuthenticatedRequest, res: Response) {
    const data = await service.getPurchaseInvoiceById(req.params.id as string);
    sendSuccess(res, data);
  }

  // Purchase Returns
  async listReturns(req: AuthenticatedRequest, res: Response) {
    const { skip, limit, branchId, warehouseId, supplierId, search } = req.query;
    const data = await service.listPurchaseReturns(req.user!.organizationId, {
      skip: skip ? parseInt(skip as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      branchId: branchId as string,
      warehouseId: warehouseId as string,
      supplierId: supplierId as string,
      search: search as string,
    });
    sendSuccess(res, data);
  }

  async createReturn(req: AuthenticatedRequest, res: Response) {
    const data = await service.createPurchaseReturn(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  // Payments
  async listPayments(req: AuthenticatedRequest, res: Response) {
    const { skip, limit, supplierId, search } = req.query;
    const data = await service.listSupplierPayments(req.user!.organizationId, {
      skip: skip ? parseInt(skip as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      supplierId: supplierId as string,
      search: search as string,
    });
    sendSuccess(res, data);
  }

  async createPayment(req: AuthenticatedRequest, res: Response) {
    const data = await service.createSupplierPayment(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  async cancelPayment(req: AuthenticatedRequest, res: Response) {
    const data = await service.cancelSupplierPayment(req.params.id as string, req.user!.userId);
    sendSuccess(res, data);
  }

  // Dashboard
  async getDashboard(req: AuthenticatedRequest, res: Response) {
    const branchId = req.query.branchId as string;
    const data = await service.getPurchasingDashboard(req.user!.organizationId, branchId);
    sendSuccess(res, data);
  }
}
