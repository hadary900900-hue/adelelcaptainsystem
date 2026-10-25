import { Router } from 'express';
import { WarehousesController } from './warehouses.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createWarehouseSchema, updateWarehouseSchema } from '@erp/shared';

const router = Router();
const controller = new WarehousesController();

router.use(authMiddleware);

router.get('/', requirePermission('warehouses.view'), controller.list);
router.get('/:id', requirePermission('warehouses.view'), controller.getById);
router.post('/', requirePermission('warehouses.create'), validate(createWarehouseSchema), controller.create);
router.put('/:id', requirePermission('warehouses.update'), validate(updateWarehouseSchema), controller.update);
router.delete('/:id', requirePermission('warehouses.delete'), controller.delete);

export default router;
