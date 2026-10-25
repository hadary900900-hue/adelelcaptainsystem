import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new SalesController();

router.use(authMiddleware);

// Dashboard
router.get('/dashboard', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.getDashboard(req, res).catch(next));

// Quotations
router.get('/quotations', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.listQuotations(req, res).catch(next));
router.get('/quotations/:id', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.getQuotationById(req, res).catch(next));
router.post('/quotations', requirePermission(PERMISSIONS.SALES.CREATE), (req, res, next) => controller.createQuotation(req, res).catch(next));

// Orders
router.get('/orders', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.listOrders(req, res).catch(next));
router.get('/orders/:id', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.getOrderById(req, res).catch(next));
router.post('/orders', requirePermission(PERMISSIONS.SALES.CREATE), (req, res, next) => controller.createOrder(req, res).catch(next));

// Invoices (POS & Standard)
router.get('/invoices', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.listInvoices(req, res).catch(next));
router.get('/invoices/:id', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.getInvoiceById(req, res).catch(next));
router.post('/invoices', requirePermission(PERMISSIONS.SALES.CREATE), (req, res, next) => controller.createInvoice(req, res).catch(next));
router.put('/invoices/:id', requirePermission(PERMISSIONS.SALES.UPDATE), (req, res, next) => controller.updateInvoice(req, res).catch(next));
router.delete('/invoices/:id', requirePermission(PERMISSIONS.SALES.DELETE), (req, res, next) => controller.deleteInvoice(req, res).catch(next));
router.post('/invoices/:id/cancel-goods-issue', requirePermission(PERMISSIONS.SALES.UPDATE), (req, res, next) => controller.cancelGoodsIssue(req, res).catch(next));

// Returns
router.get('/returns', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.listReturns(req, res).catch(next));
router.post('/returns', requirePermission(PERMISSIONS.SALES.RETURN), (req, res, next) => controller.createReturn(req, res).catch(next));

// Payments
router.post('/payments', requirePermission(PERMISSIONS.SALES.PAYMENT), (req, res, next) => controller.createPayment(req, res).catch(next));
router.delete('/payments/:id', requirePermission(PERMISSIONS.SALES.PAYMENT), (req, res, next) => controller.cancelPayment(req, res).catch(next));

export default router;
