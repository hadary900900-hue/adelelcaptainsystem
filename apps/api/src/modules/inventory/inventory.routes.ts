import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new InventoryController();

router.use(authMiddleware);

router.get('/balances', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.getStockBalances(req, res).catch(next));
router.put('/balances/:id', requirePermission(PERMISSIONS.INVENTORY.ADJUST), (req, res, next) => controller.updateStockBalance(req, res).catch(next));
router.delete('/balances/:id', requirePermission(PERMISSIONS.INVENTORY.ADJUST), (req, res, next) => controller.deleteStockBalance(req, res).catch(next));
router.get('/movements', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.getMovements(req, res).catch(next));

router.get('/transfers', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.listTransfers(req, res).catch(next));
router.post('/transfers', requirePermission(PERMISSIONS.INVENTORY.TRANSFER), (req, res, next) => controller.createTransfer(req, res).catch(next));
router.post('/transfers/:id/accept', requirePermission(PERMISSIONS.INVENTORY.TRANSFER), (req, res, next) => controller.acceptTransfer(req, res).catch(next));
router.post('/transfers/:id/cancel', requirePermission(PERMISSIONS.INVENTORY.TRANSFER), (req, res, next) => controller.cancelTransfer(req, res).catch(next));

router.get('/adjustments', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.listAdjustments(req, res).catch(next));
router.post('/adjustments', requirePermission(PERMISSIONS.INVENTORY.ADJUST), (req, res, next) => controller.createAdjustment(req, res).catch(next));

router.get('/counts', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.listCounts(req, res).catch(next));
router.post('/counts', requirePermission(PERMISSIONS.INVENTORY.COUNT), (req, res, next) => controller.createCount(req, res).catch(next));

router.get('/vehicles', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.getVehicleUnits(req, res).catch(next));

// Stock Orders (Replenishment Requests)
router.get('/stock-orders', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.listStockOrders(req, res).catch(next));
router.post('/stock-orders', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.createStockOrder(req, res).catch(next));
router.post('/stock-orders/:id/action', requirePermission(PERMISSIONS.INVENTORY.ADJUST), (req, res, next) => controller.confirmStockOrder(req, res).catch(next));
router.get('/low-stock', requirePermission(PERMISSIONS.INVENTORY.VIEW), (req, res, next) => controller.getLowStockItems(req, res).catch(next));

export default router;
