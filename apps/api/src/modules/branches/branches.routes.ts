import { Router } from 'express';
import { BranchesController } from './branches.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createBranchSchema, updateBranchSchema } from '@erp/shared';

const router = Router();
const controller = new BranchesController();

router.use(authMiddleware);

router.get('/', requirePermission('branches.view'), controller.list);
router.get('/:id', requirePermission('branches.view'), controller.getById);
router.post('/', requirePermission('branches.create'), validate(createBranchSchema), controller.create);
router.put('/:id', requirePermission('branches.update'), validate(updateBranchSchema), controller.update);
router.delete('/:id', requirePermission('branches.delete'), controller.delete);

export default router;
