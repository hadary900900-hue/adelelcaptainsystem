import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new CustomersController();

router.use(authMiddleware);

router.get('/', requirePermission(PERMISSIONS.CUSTOMERS.VIEW), (req, res, next) => controller.list(req, res).catch(next));
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS.VIEW), (req, res, next) => controller.getById(req, res).catch(next));
router.get('/:id/statement', requirePermission(PERMISSIONS.CUSTOMERS.VIEW), (req, res, next) => controller.getStatement(req, res).catch(next));
router.post('/', requirePermission(PERMISSIONS.CUSTOMERS.CREATE), (req, res, next) => controller.create(req, res).catch(next));
router.put('/:id', requirePermission(PERMISSIONS.CUSTOMERS.UPDATE), (req, res, next) => controller.update(req, res).catch(next));
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMERS.DELETE), (req, res, next) => controller.delete(req, res).catch(next));
router.post('/:id/notes', requirePermission(PERMISSIONS.CUSTOMERS.UPDATE), (req, res, next) => controller.addNote(req, res).catch(next));

export default router;
