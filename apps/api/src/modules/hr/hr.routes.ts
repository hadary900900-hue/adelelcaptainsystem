import { Router } from 'express';
import { HrController } from './hr.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new HrController();

router.use(authMiddleware);

// Dashboard
router.get('/dashboard', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.getDashboard(req, res).catch(next));

// Departments
router.get('/departments', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.listDepartments(req, res).catch(next));
router.post('/departments', requirePermission(PERMISSIONS.HR.CREATE), (req, res, next) => controller.createDepartment(req, res).catch(next));

// Positions
router.get('/positions', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.listPositions(req, res).catch(next));
router.post('/positions', requirePermission(PERMISSIONS.HR.CREATE), (req, res, next) => controller.createPosition(req, res).catch(next));

// Shifts
router.get('/shifts', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.listShifts(req, res).catch(next));
router.post('/shifts', requirePermission(PERMISSIONS.HR.CREATE), (req, res, next) => controller.createShift(req, res).catch(next));

// Employees
router.get('/employees', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.listEmployees(req, res).catch(next));
router.get('/employees/:id', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.getEmployeeById(req, res).catch(next));
router.post('/employees', requirePermission(PERMISSIONS.HR.CREATE), (req, res, next) => controller.createEmployee(req, res).catch(next));
router.put('/employees/:id', requirePermission(PERMISSIONS.HR.UPDATE), (req, res, next) => controller.updateEmployee(req, res).catch(next));

// Salary Structure (Protected)
router.put('/employees/:id/salary', requirePermission(PERMISSIONS.HR.MANAGE_SALARY), (req, res, next) => controller.updateSalaryStructure(req, res).catch(next));

// Attendance
router.get('/attendance', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.listAttendance(req, res).catch(next));
router.post('/attendance/check-in', requirePermission(PERMISSIONS.HR.MANAGE_ATTENDANCE), (req, res, next) => controller.recordCheckIn(req, res).catch(next));
router.post('/attendance/check-out', requirePermission(PERMISSIONS.HR.MANAGE_ATTENDANCE), (req, res, next) => controller.recordCheckOut(req, res).catch(next));

// Leaves
router.get('/leaves', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.listLeaves(req, res).catch(next));
router.post('/leaves', requirePermission(PERMISSIONS.HR.CREATE), (req, res, next) => controller.createLeaveRequest(req, res).catch(next));
router.put('/leaves/:id/status', requirePermission(PERMISSIONS.HR.MANAGE_LEAVE), (req, res, next) => controller.updateLeaveStatus(req, res).catch(next));

// Advances
router.get('/advances', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.listAdvances(req, res).catch(next));
router.post('/advances', requirePermission(PERMISSIONS.HR.MANAGE_ADVANCES), (req, res, next) => controller.createSalaryAdvance(req, res).catch(next));

// Bonuses & Deductions (Adjustments)
router.get('/adjustments', requirePermission(PERMISSIONS.HR.VIEW), (req, res, next) => controller.listAdjustments(req, res).catch(next));
router.post('/adjustments', requirePermission(PERMISSIONS.HR.MANAGE_ADJUSTMENTS), (req, res, next) => controller.createAdjustment(req, res).catch(next));

// Payroll
router.get('/payrolls', requirePermission(PERMISSIONS.HR.MANAGE_PAYROLL), (req, res, next) => controller.listPayrolls(req, res).catch(next));
router.get('/payrolls/:id', requirePermission(PERMISSIONS.HR.MANAGE_PAYROLL), (req, res, next) => controller.getPayrollById(req, res).catch(next));
router.post('/payrolls/generate', requirePermission(PERMISSIONS.HR.MANAGE_PAYROLL), (req, res, next) => controller.generatePayroll(req, res).catch(next));
router.post('/payrolls/:id/approve', requirePermission(PERMISSIONS.HR.MANAGE_PAYROLL), (req, res, next) => controller.approveAndPayPayroll(req, res).catch(next));

export default router;
