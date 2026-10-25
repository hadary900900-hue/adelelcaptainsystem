import { Router } from 'express';
import { PurchasingController } from './purchasing.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new PurchasingController();

router.use(authMiddleware);

// Dashboard
router.get('/dashboard', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.getDashboard(req, res).catch(next));

// Supplier Categories
router.get('/categories', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.listCategories(req, res).catch(next));
router.post('/categories', requirePermission(PERMISSIONS.PURCHASING.CREATE), (req, res, next) => controller.createCategory(req, res).catch(next));

// Suppliers
router.get('/suppliers', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.listSuppliers(req, res).catch(next));
router.get('/suppliers/:id', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.getSupplierById(req, res).catch(next));
router.post('/suppliers', requirePermission(PERMISSIONS.PURCHASING.CREATE), (req, res, next) => controller.createSupplier(req, res).catch(next));
router.put('/suppliers/:id', requirePermission(PERMISSIONS.PURCHASING.UPDATE), (req, res, next) => controller.updateSupplier(req, res).catch(next));
router.get('/suppliers/:id/statement', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.getSupplierStatement(req, res).catch(next));

// Purchase Quotations
router.get('/quotations', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.listQuotations(req, res).catch(next));
router.post('/quotations', requirePermission(PERMISSIONS.PURCHASING.CREATE), (req, res, next) => controller.createQuotation(req, res).catch(next));

// Purchase Orders
router.get('/orders', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.listOrders(req, res).catch(next));
router.post('/orders', requirePermission(PERMISSIONS.PURCHASING.CREATE), (req, res, next) => controller.createOrder(req, res).catch(next));

// Goods Receipt (Inventory In & Vehicles Creation)
router.get('/goods-receipts', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.listGoodsReceipts(req, res).catch(next));
router.post('/goods-receipts', requirePermission(PERMISSIONS.PURCHASING.RECEIVE), (req, res, next) => controller.createGoodsReceipt(req, res).catch(next));

// Purchase Invoices (AP)
router.get('/invoices', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.listInvoices(req, res).catch(next));
router.get('/invoices/:id', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.getInvoiceById(req, res).catch(next));
router.post('/invoices', requirePermission(PERMISSIONS.PURCHASING.CREATE), (req, res, next) => controller.createInvoice(req, res).catch(next));
router.put('/invoices/:id', requirePermission(PERMISSIONS.PURCHASING.UPDATE), (req, res, next) => controller.updateInvoice(req, res).catch(next));

// Purchase Returns
router.get('/returns', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.listReturns(req, res).catch(next));
router.post('/returns', requirePermission(PERMISSIONS.PURCHASING.RETURN), (req, res, next) => controller.createReturn(req, res).catch(next));

// Supplier Payments
router.get('/payments', requirePermission(PERMISSIONS.PURCHASING.VIEW), (req, res, next) => controller.listPayments(req, res).catch(next));
router.post('/payments', requirePermission(PERMISSIONS.PURCHASING.PAYMENT), (req, res, next) => controller.createPayment(req, res).catch(next));
router.delete('/payments/:id', requirePermission(PERMISSIONS.PURCHASING.PAYMENT), (req, res, next) => controller.cancelPayment(req, res).catch(next));

export default router;
