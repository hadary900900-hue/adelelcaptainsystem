import { Router } from 'express';
import { UsersController } from './users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createUserSchema, updateUserSchema } from '@erp/shared';

const router = Router();
const controller = new UsersController();

router.use(authMiddleware);

router.get('/', requirePermission('users.view'), controller.list);
router.get('/:id', requirePermission('users.view'), controller.getById);
router.post('/', requirePermission('users.create'), validate(createUserSchema), controller.create);
router.put('/:id', requirePermission('users.update'), validate(updateUserSchema), controller.update);
router.delete('/:id', requirePermission('users.delete'), controller.delete);
router.patch('/:id/toggle-active', requirePermission('users.update'), controller.toggleActive);
router.get('/:id/permissions', requirePermission('users.view'), controller.getUserPermissions);
router.put('/:id/permissions', requirePermission('users.update'), controller.updateUserPermissions);

export default router;
