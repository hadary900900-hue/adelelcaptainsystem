import { Router } from 'express';
import { VehiclesController } from './vehicles.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new VehiclesController();

router.use(authMiddleware);

router.get('/', requirePermission(PERMISSIONS.VEHICLES.VIEW), (req, res, next) => controller.list(req, res).catch(next));
router.get('/vin/:vin', requirePermission(PERMISSIONS.VEHICLES.VIEW), (req, res, next) => controller.getByVin(req, res).catch(next));
router.get('/:id', requirePermission(PERMISSIONS.VEHICLES.VIEW), (req, res, next) => controller.getById(req, res).catch(next));
router.post('/', requirePermission(PERMISSIONS.VEHICLES.CREATE), (req, res, next) => controller.create(req, res).catch(next));
router.put('/:id', requirePermission(PERMISSIONS.VEHICLES.UPDATE), (req, res, next) => controller.update(req, res).catch(next));
router.delete('/:id', requirePermission(PERMISSIONS.VEHICLES.DELETE), (req, res, next) => controller.delete(req, res).catch(next));

export default router;
