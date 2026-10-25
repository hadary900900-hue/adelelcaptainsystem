import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();
const controller = new AuditController();

router.use(authMiddleware);
router.get('/', requirePermission('audit.view'), controller.list);

export default router;
