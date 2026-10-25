import { Router } from 'express';
import { ProductsController } from './products.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new ProductsController();

router.use(authMiddleware);

router.get('/', requirePermission(PERMISSIONS.PRODUCTS.VIEW), (req, res, next) => controller.list(req, res).catch(next));
router.get('/barcode/:barcode', requirePermission(PERMISSIONS.PRODUCTS.VIEW), (req, res, next) => controller.getByBarcode(req, res).catch(next));
router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS.VIEW), (req, res, next) => controller.getById(req, res).catch(next));
router.post('/', requirePermission(PERMISSIONS.PRODUCTS.CREATE), (req, res, next) => controller.create(req, res).catch(next));
router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS.UPDATE), (req, res, next) => controller.update(req, res).catch(next));
router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS.DELETE), (req, res, next) => controller.delete(req, res).catch(next));

export default router;
