import { Router } from 'express';
import { WorkshopController } from './workshop.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new WorkshopController();

router.use(authMiddleware);

// List and single Work Orders
router.get('/', requirePermission(PERMISSIONS.WORKSHOP.VIEW), (req, res, next) =>
  controller.listWorkOrders(req, res).catch(next)
);
router.get('/:id', requirePermission(PERMISSIONS.WORKSHOP.VIEW), (req, res, next) =>
  controller.getWorkOrderById(req, res).catch(next)
);

// Reception / Create Work Order
router.post('/', requirePermission(PERMISSIONS.WORKSHOP.CREATE), (req, res, next) =>
  controller.createReception(req, res).catch(next)
);

// Update Work Order Details / Status
router.put('/:id', requirePermission(PERMISSIONS.WORKSHOP.UPDATE), (req, res, next) =>
  controller.updateWorkOrder(req, res).catch(next)
);

// Line items (Spare parts & Labor services)
router.post('/:id/items', requirePermission(PERMISSIONS.WORKSHOP.UPDATE), (req, res, next) =>
  controller.addWorkOrderItem(req, res).catch(next)
);
router.delete('/:id/items/:itemId', requirePermission(PERMISSIONS.WORKSHOP.UPDATE), (req, res, next) =>
  controller.removeWorkOrderItem(req, res).catch(next)
);

// Finalize: Complete Service & Generate Invoice (Atomic & Idempotent)
router.post('/:id/complete', requirePermission(PERMISSIONS.WORKSHOP.COMPLETE), (req, res, next) =>
  controller.completeAndGenerateInvoice(req, res).catch(next)
);

// Vehicle Handover & Delivery
router.post('/:id/deliver', requirePermission(PERMISSIONS.WORKSHOP.DELIVER), (req, res, next) =>
  controller.deliverVehicle(req, res).catch(next)
);

// Service Histories
router.get('/history/vehicle/:vehicleUnitId', requirePermission(PERMISSIONS.WORKSHOP.VIEW), (req, res, next) =>
  controller.getVehicleHistory(req, res).catch(next)
);
router.get('/history/customer/:customerId', requirePermission(PERMISSIONS.WORKSHOP.VIEW), (req, res, next) =>
  controller.getCustomerHistory(req, res).catch(next)
);
router.get('/customer/:customerId/vehicles', requirePermission(PERMISSIONS.WORKSHOP.VIEW), (req, res, next) =>
  controller.getCustomerVehicles(req, res).catch(next)
);
router.post('/customer/:customerId/vehicles', requirePermission(PERMISSIONS.WORKSHOP.CREATE), (req, res, next) =>
  controller.linkCustomerVehicle(req, res).catch(next)
);

export default router;
