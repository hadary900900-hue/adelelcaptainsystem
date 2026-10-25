import { Router } from 'express';
import { BrandsController } from './brands.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new BrandsController();

router.use(authMiddleware);

router.get('/', requirePermission(PERMISSIONS.BRANDS.VIEW), (req, res, next) => controller.list(req, res).catch(next));
router.get('/:id', requirePermission(PERMISSIONS.BRANDS.VIEW), (req, res, next) => controller.getById(req, res).catch(next));
router.post('/', requirePermission(PERMISSIONS.BRANDS.CREATE), (req, res, next) => controller.create(req, res).catch(next));
router.put('/:id', requirePermission(PERMISSIONS.BRANDS.UPDATE), (req, res, next) => controller.update(req, res).catch(next));
router.delete('/:id', requirePermission(PERMISSIONS.BRANDS.DELETE), (req, res, next) => controller.delete(req, res).catch(next));

router.get('/:id/models', requirePermission(PERMISSIONS.BRANDS.VIEW), (req, res, next) => controller.listModels(req, res).catch(next));
router.post('/:id/models', requirePermission(PERMISSIONS.BRANDS.CREATE), (req, res, next) => controller.createModel(req, res).catch(next));

export default router;
