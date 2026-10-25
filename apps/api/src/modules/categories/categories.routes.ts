import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new CategoriesController();

router.use(authMiddleware);

router.get('/', requirePermission(PERMISSIONS.CATEGORIES.VIEW), (req, res, next) => controller.list(req, res).catch(next));
router.get('/:id', requirePermission(PERMISSIONS.CATEGORIES.VIEW), (req, res, next) => controller.getById(req, res).catch(next));
router.post('/', requirePermission(PERMISSIONS.CATEGORIES.CREATE), (req, res, next) => controller.create(req, res).catch(next));
router.put('/:id', requirePermission(PERMISSIONS.CATEGORIES.UPDATE), (req, res, next) => controller.update(req, res).catch(next));
router.delete('/:id', requirePermission(PERMISSIONS.CATEGORIES.DELETE), (req, res, next) => controller.delete(req, res).catch(next));

export default router;
