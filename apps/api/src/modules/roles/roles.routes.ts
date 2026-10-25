import { Router } from 'express';
import { RolesController } from './roles.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createRoleSchema, updateRoleSchema } from '@erp/shared';

const router = Router();
const controller = new RolesController();

router.use(authMiddleware);

router.get('/', requirePermission('roles.view'), controller.list);
router.get('/permissions', requirePermission('roles.view'), controller.getPermissions);
router.get('/:id', requirePermission('roles.view'), controller.getById);
router.post('/', requirePermission('roles.create'), validate(createRoleSchema), controller.create);
router.put('/:id', requirePermission('roles.update'), validate(updateRoleSchema), controller.update);
router.delete('/:id', requirePermission('roles.delete'), controller.delete);

export default router;
