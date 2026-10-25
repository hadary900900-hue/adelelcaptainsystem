import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { HrService } from './hr.service';
import { sendSuccess } from '../../utils/response';

const service = new HrService();

export class HrController {
  // Departments & Positions
  async listDepartments(req: AuthenticatedRequest, res: Response) {
    const data = await service.listDepartments(req.user!.organizationId);
    sendSuccess(res, data);
  }

  async createDepartment(req: AuthenticatedRequest, res: Response) {
    const data = await service.createDepartment(req.user!.organizationId, req.body);
    sendSuccess(res, data, 201);
  }

  async listPositions(req: AuthenticatedRequest, res: Response) {
    const { departmentId } = req.query;
    const data = await service.listPositions(req.user!.organizationId, departmentId as string);
    sendSuccess(res, data);
  }

  async createPosition(req: AuthenticatedRequest, res: Response) {
    const data = await service.createPosition(req.user!.organizationId, req.body);
    sendSuccess(res, data, 201);
  }

  // Shifts
  async listShifts(req: AuthenticatedRequest, res: Response) {
    const data = await service.listShifts(req.user!.organizationId);
    sendSuccess(res, data);
  }

  async createShift(req: AuthenticatedRequest, res: Response) {
    const data = await service.createShift(req.user!.organizationId, req.body);
    sendSuccess(res, data, 201);
  }

  // Employees
  async listEmployees(req: AuthenticatedRequest, res: Response) {
    const { skip, limit, branchId, departmentId, positionId, status, search } = req.query;
    const data = await service.listEmployees(req.user!.organizationId, {
      skip: skip ? parseInt(skip as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      branchId: branchId as string,
      departmentId: departmentId as string,
      positionId: positionId as string,
      status: status as string,
      search: search as string,
    });

    // Strip sensitive salary info if user doesn't have hr.view_salary permission
    const hasSalaryPermission = req.user?.permissions?.includes('hr.view_salary');
    if (!hasSalaryPermission && data.data) {
      data.data = data.data.map((emp: any) => ({
        ...emp,
        salaryStructure: undefined,
      }));
    }

    sendSuccess(res, data);
  }

  async getEmployeeById(req: AuthenticatedRequest, res: Response) {
    const employee = await service.getEmployeeById(req.params.id as string);

    // Filter salary if not permitted
    const hasSalaryPermission = req.user?.permissions?.includes('hr.view_salary');
    if (!hasSalaryPermission) {
      employee.salaryStructure = null;
      employee.payrollItems = [];
      employee.advances = [];
    }

    sendSuccess(res, employee);
  }

  async createEmployee(req: AuthenticatedRequest, res: Response) {
    const data = await service.createEmployee(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  async updateEmployee(req: AuthenticatedRequest, res: Response) {
    const data = await service.updateEmployee(req.params.id as string, req.body, req.user!.userId);
    sendSuccess(res, data);
  }

  // Salary Structure (Protected)
  async updateSalaryStructure(req: AuthenticatedRequest, res: Response) {
    const data = await service.updateSalaryStructure(req.params.id as string, req.body, req.user!.userId);
    sendSuccess(res, data);
  }

  // Attendance
  async listAttendance(req: AuthenticatedRequest, res: Response) {
    const { date, branchId, departmentId, employeeId, status } = req.query;
    const data = await service.listAttendance(req.user!.organizationId, {
      date: date as string,
      branchId: branchId as string,
      departmentId: departmentId as string,
      employeeId: employeeId as string,
      status: status as string,
    });
    sendSuccess(res, data);
  }

  async recordCheckIn(req: AuthenticatedRequest, res: Response) {
    const { employeeId, time } = req.body;
    const data = await service.recordCheckIn(employeeId, time ? new Date(time) : undefined);
    sendSuccess(res, data);
  }

  async recordCheckOut(req: AuthenticatedRequest, res: Response) {
    const { employeeId, time } = req.body;
    const data = await service.recordCheckOut(employeeId, time ? new Date(time) : undefined);
    sendSuccess(res, data);
  }

  // Leaves
  async listLeaves(req: AuthenticatedRequest, res: Response) {
    const { employeeId, status } = req.query;
    const data = await service.listLeaves(req.user!.organizationId, {
      employeeId: employeeId as string,
      status: status as string,
    });
    sendSuccess(res, data);
  }

  async createLeaveRequest(req: AuthenticatedRequest, res: Response) {
    const data = await service.createLeaveRequest(req.body);
    sendSuccess(res, data, 201);
  }

  async updateLeaveStatus(req: AuthenticatedRequest, res: Response) {
    const { status, notes } = req.body;
    const data = await service.updateLeaveStatus(req.params.id as string, status, req.user!.userId, notes);
    sendSuccess(res, data);
  }

  // Advances & Adjustments
  async listAdvances(req: AuthenticatedRequest, res: Response) {
    const { employeeId, month, status } = req.query;
    const data = await service.listAdvances(req.user!.organizationId, {
      employeeId: employeeId as string,
      month: month as string,
      status: status as string,
    });
    sendSuccess(res, data);
  }

  async createSalaryAdvance(req: AuthenticatedRequest, res: Response) {
    const data = await service.createSalaryAdvance(req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  async listAdjustments(req: AuthenticatedRequest, res: Response) {
    const { employeeId, month, type } = req.query;
    const data = await service.listAdjustments(req.user!.organizationId, {
      employeeId: employeeId as string,
      month: month as string,
      type: type as string,
    });
    sendSuccess(res, data);
  }

  async createAdjustment(req: AuthenticatedRequest, res: Response) {
    const data = await service.createAdjustment(req.body);
    sendSuccess(res, data, 201);
  }

  // Payroll
  async generatePayroll(req: AuthenticatedRequest, res: Response) {
    const { branchId, month } = req.body;
    const data = await service.generatePayroll(req.user!.organizationId, branchId, month, req.user!.userId);
    sendSuccess(res, data, 201);
  }

  async listPayrolls(req: AuthenticatedRequest, res: Response) {
    const { branchId, month } = req.query;
    const data = await service.listPayrolls(req.user!.organizationId, {
      branchId: branchId as string,
      month: month as string,
    });
    sendSuccess(res, data);
  }

  async getPayrollById(req: AuthenticatedRequest, res: Response) {
    const data = await service.getPayrollById(req.params.id as string);
    sendSuccess(res, data);
  }

  async approveAndPayPayroll(req: AuthenticatedRequest, res: Response) {
    const { paymentMethod } = req.body;
    const data = await service.approveAndPayPayroll(req.params.id as string, paymentMethod || 'BANK_TRANSFER', req.user!.userId);
    sendSuccess(res, data);
  }

  // Dashboard
  async getDashboard(req: AuthenticatedRequest, res: Response) {
    const branchId = req.query.branchId as string;
    const data = await service.getHrDashboard(req.user!.organizationId, branchId);
    sendSuccess(res, data);
  }
}
