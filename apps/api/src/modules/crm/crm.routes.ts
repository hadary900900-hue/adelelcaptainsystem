import { Router } from 'express';
import { CrmController } from './crm.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new CrmController();

router.use(authMiddleware);

// Leads
router.get('/leads', requirePermission(PERMISSIONS.CRM.VIEW), (req, res, next) => controller.listLeads(req, res).catch(next));
router.get('/leads/:id', requirePermission(PERMISSIONS.CRM.VIEW), (req, res, next) => controller.getLeadById(req, res).catch(next));
router.post('/leads', requirePermission(PERMISSIONS.CRM.CREATE), (req, res, next) => controller.createLead(req, res).catch(next));
router.put('/leads/:id', requirePermission(PERMISSIONS.CRM.UPDATE), (req, res, next) => controller.updateLead(req, res).catch(next));
router.delete('/leads/:id', requirePermission(PERMISSIONS.CRM.DELETE), (req, res, next) => controller.deleteLead(req, res).catch(next));

// Activities
router.get('/activities', requirePermission(PERMISSIONS.CRM.VIEW), (req, res, next) => controller.listActivities(req, res).catch(next));
router.post('/activities', requirePermission(PERMISSIONS.CRM.CREATE), (req, res, next) => controller.createActivity(req, res).catch(next));
router.put('/activities/:id', requirePermission(PERMISSIONS.CRM.UPDATE), (req, res, next) => controller.updateActivity(req, res).catch(next));
router.delete('/activities/:id', requirePermission(PERMISSIONS.CRM.DELETE), (req, res, next) => controller.deleteActivity(req, res).catch(next));

// Reservations
router.get('/reservations', requirePermission(PERMISSIONS.SALES.VIEW), (req, res, next) => controller.listReservations(req, res).catch(next));
router.post('/reservations', requirePermission(PERMISSIONS.SALES.CREATE), (req, res, next) => controller.createReservation(req, res).catch(next));
router.post('/reservations/:id/cancel', requirePermission(PERMISSIONS.SALES.CREATE), (req, res, next) => controller.cancelReservation(req, res).catch(next));

export default router;
