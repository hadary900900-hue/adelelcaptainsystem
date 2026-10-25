import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();
const controller = new DashboardController();

router.use(authMiddleware);
router.get('/', requirePermission('dashboard.view'), controller.getStats);

export default router;
