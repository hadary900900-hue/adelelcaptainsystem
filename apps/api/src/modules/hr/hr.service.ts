import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class HrService {
  // ==========================================
  // 1. DEPARTMENTS & POSITIONS
  // ==========================================
  async listDepartments(orgId: string) {
    return prisma.department.findMany({
      where: { organizationId: orgId },
      include: {
        positions: true,
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDepartment(orgId: string, data: any) {
    const code = (data.code || `DEP-${Date.now()}`).toUpperCase().trim();
    const existing = await prisma.department.findUnique({
      where: { organizationId_code: { organizationId: orgId, code } },
    });
    if (existing) throw new AppError('Department code already exists', 400);

    return prisma.department.create({
      data: {
        organizationId: orgId,
        code,
        nameAr: data.nameAr || data.nameEn,
        nameEn: data.nameEn || data.nameAr,
        description: data.description || null,
        managerId: data.managerId || null,
      },
    });
  }

  async listPositions(orgId: string, departmentId?: string) {
    const where: any = { organizationId: orgId };
    if (departmentId) where.departmentId = departmentId;
    return prisma.position.findMany({
      where,
      include: {
        department: true,
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPosition(orgId: string, data: any) {
    const code = (data.code || `POS-${Date.now()}`).toUpperCase().trim();
    const existing = await prisma.position.findUnique({
      where: { organizationId_code: { organizationId: orgId, code } },
    });
    if (existing) throw new AppError('Position code already exists', 400);

    return prisma.position.create({
      data: {
        organizationId: orgId,
        code,
        departmentId: data.departmentId || null,
        titleAr: data.titleAr || data.titleEn,
        titleEn: data.titleEn || data.titleAr,
        description: data.description || null,
        minSalary: Number(data.minSalary || 0),
        maxSalary: Number(data.maxSalary || 0),
      },
    });
  }

  // ==========================================
  // 2. SHIFTS
  // ==========================================
  async listShifts(orgId: string) {
    return prisma.shift.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { employees: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createShift(orgId: string, data: any) {
    return prisma.shift.create({
      data: {
        organizationId: orgId,
        nameAr: data.nameAr || data.nameEn,
        nameEn: data.nameEn || data.nameAr,
        startTime: data.startTime || '09:00',
        endTime: data.endTime || '17:00',
        gracePeriodMins: Number(data.gracePeriodMins !== undefined ? data.gracePeriodMins : 15),
        workDays: data.workDays || 'SUN,MON,TUE,WED,THU,SAT',
      },
    });
  }

  // ==========================================
  // 3. EMPLOYEES & PROFILES
  // ==========================================
  async listEmployees(orgId: string, { skip, limit, branchId, departmentId, positionId, status, search }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (departmentId) where.departmentId = departmentId;
    if (positionId) where.positionId = positionId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { employeeNumber: { contains: search } },
        { firstNameAr: { contains: search } },
        { lastNameAr: { contains: search } },
        { firstNameEn: { contains: search } },
        { lastNameEn: { contains: search } },
        { phone: { contains: search } },
        { nationalId: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: true,
          department: true,
          position: true,
          shift: true,
          salaryStructure: true,
          user: { select: { id: true, email: true, lastLoginAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async getEmployeeById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        branch: true,
        department: true,
        position: true,
        shift: true,
        salaryStructure: true,
        user: { select: { id: true, email: true, lastLoginAt: true } },
        attendances: {
          take: 30,
          orderBy: { date: 'desc' },
        },
        leaveRequests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        advances: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        bonusDeductions: {
          take: 20,
          orderBy: { date: 'desc' },
        },
        payrollItems: {
          take: 12,
          orderBy: { payroll: { month: 'desc' } },
          include: { payroll: true },
        },
      },
    });

    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
  }

  async createEmployee(orgId: string, data: any, userId: string) {
    const employeeNumber = (data.employeeNumber || `EMP-${Math.floor(1000 + Math.random() * 9000)}`).trim();
    
    // Check existing employee number or national ID
    const existingNum = await prisma.employee.findUnique({
      where: { organizationId_employeeNumber: { organizationId: orgId, employeeNumber } },
    });
    if (existingNum) throw new AppError('Employee number already exists', 400);

    const existingNat = await prisma.employee.findUnique({
      where: { nationalId: data.nationalId },
    });
    if (existingNat) throw new AppError('National ID already registered with another employee', 400);

    return prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          organizationId: orgId,
          branchId: data.branchId,
          departmentId: data.departmentId || null,
          positionId: data.positionId || null,
          shiftId: data.shiftId || null,
          userId: data.userId || null,
          employeeNumber,
          firstNameAr: data.firstNameAr,
          lastNameAr: data.lastNameAr,
          firstNameEn: data.firstNameEn || null,
          lastNameEn: data.lastNameEn || null,
          nationalId: data.nationalId,
          phone: data.phone,
          email: data.email || null,
          gender: data.gender || 'MALE',
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
          contractType: data.contractType || 'FULL_TIME',
          contractEnd: data.contractEnd ? new Date(data.contractEnd) : null,
          address: data.address || null,
          emergencyContact: data.emergencyContact || null,
          emergencyPhone: data.emergencyPhone || null,
          bankName: data.bankName || null,
          bankAccountNumber: data.bankAccountNumber || null,
          iban: data.iban || null,
          notes: data.notes || null,
        },
      });

      // Create initial salary structure if provided
      if (data.basicSalary !== undefined) {
        await tx.salaryStructure.create({
          data: {
            employeeId: employee.id,
            basicSalary: Number(data.basicSalary || 0),
            housingAllowance: Number(data.housingAllowance || 0),
            transportAllowance: Number(data.transportAllowance || 0),
            otherAllowances: Number(data.otherAllowances || 0),
            socialInsurance: Number(data.socialInsurance || 0),
            medicalInsurance: Number(data.medicalInsurance || 0),
            taxDeduction: Number(data.taxDeduction || 0),
            overtimeHourRate: Number(data.overtimeHourRate || 0),
            currency: data.currency || 'EGP',
          },
        });
      }

      createAuditLog({
        userId,
        branchId: data.branchId,
        entityType: 'Employee',
        entityId: employee.id,
        action: 'create',
        afterData: employee,
      });

      return employee;
    });
  }

  async updateEmployee(id: string, data: any, userId: string) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new AppError('Employee not found', 404);

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        branchId: data.branchId !== undefined ? data.branchId : existing.branchId,
        departmentId: data.departmentId !== undefined ? data.departmentId : existing.departmentId,
        positionId: data.positionId !== undefined ? data.positionId : existing.positionId,
        shiftId: data.shiftId !== undefined ? data.shiftId : existing.shiftId,
        firstNameAr: data.firstNameAr !== undefined ? data.firstNameAr : existing.firstNameAr,
        lastNameAr: data.lastNameAr !== undefined ? data.lastNameAr : existing.lastNameAr,
        firstNameEn: data.firstNameEn !== undefined ? data.firstNameEn : existing.firstNameEn,
        lastNameEn: data.lastNameEn !== undefined ? data.lastNameEn : existing.lastNameEn,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        email: data.email !== undefined ? data.email : existing.email,
        gender: data.gender !== undefined ? data.gender : existing.gender,
        contractType: data.contractType !== undefined ? data.contractType : existing.contractType,
        status: data.status !== undefined ? data.status : existing.status,
        address: data.address !== undefined ? data.address : existing.address,
        emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : existing.emergencyContact,
        emergencyPhone: data.emergencyPhone !== undefined ? data.emergencyPhone : existing.emergencyPhone,
        bankName: data.bankName !== undefined ? data.bankName : existing.bankName,
        bankAccountNumber: data.bankAccountNumber !== undefined ? data.bankAccountNumber : existing.bankAccountNumber,
        iban: data.iban !== undefined ? data.iban : existing.iban,
        notes: data.notes !== undefined ? data.notes : existing.notes,
      },
    });

    createAuditLog({
      userId,
      entityType: 'Employee',
      entityId: id,
      action: 'update',
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  // ==========================================
  // 4. SALARY STRUCTURE (PROTECTED BY HR PERMISSIONS)
  // ==========================================
  async updateSalaryStructure(employeeId: string, data: any, userId: string) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new AppError('Employee not found', 404);

    const salary = await prisma.salaryStructure.upsert({
      where: { employeeId },
      update: {
        basicSalary: Number(data.basicSalary || 0),
        housingAllowance: Number(data.housingAllowance || 0),
        transportAllowance: Number(data.transportAllowance || 0),
        otherAllowances: Number(data.otherAllowances || 0),
        socialInsurance: Number(data.socialInsurance || 0),
        medicalInsurance: Number(data.medicalInsurance || 0),
        taxDeduction: Number(data.taxDeduction || 0),
        overtimeHourRate: Number(data.overtimeHourRate || 0),
        currency: data.currency || 'EGP',
        notes: data.notes || null,
      },
      create: {
        employeeId,
        basicSalary: Number(data.basicSalary || 0),
        housingAllowance: Number(data.housingAllowance || 0),
        transportAllowance: Number(data.transportAllowance || 0),
        otherAllowances: Number(data.otherAllowances || 0),
        socialInsurance: Number(data.socialInsurance || 0),
        medicalInsurance: Number(data.medicalInsurance || 0),
        taxDeduction: Number(data.taxDeduction || 0),
        overtimeHourRate: Number(data.overtimeHourRate || 0),
        currency: data.currency || 'EGP',
        notes: data.notes || null,
      },
    });

    createAuditLog({
      userId,
      entityType: 'SalaryStructure',
      entityId: employeeId,
      action: 'update_salary',
      afterData: salary,
    });

    return salary;
  }

  // ==========================================
  // 5. ATTENDANCE & SHIFTS
  // ==========================================
  async listAttendance(orgId: string, { date, branchId, departmentId, employeeId, status }: any) {
    const where: any = {
      employee: { organizationId: orgId },
    };
    if (branchId) where.employee.branchId = branchId;
    if (departmentId) where.employee.departmentId = departmentId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      where.date = d;
    }

    return prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: { department: true, position: true, branch: true },
        },
        shift: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async recordCheckIn(employeeId: string, checkInTime?: Date) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });
    if (!employee) throw new AppError('Employee not found', 404);

    const now = checkInTime || new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Calculate late minutes if shift assigned
    let status = 'PRESENT';
    let lateMinutes = 0;

    if (employee.shift?.startTime) {
      const parts = employee.shift.startTime.split(':');
      const shH = Number(parts[0]) || 9;
      const shM = Number(parts[1]) || 0;
      const expectedTime = new Date(today);
      expectedTime.setHours(shH, shM, 0, 0);

      const grace = employee.shift.gracePeriodMins || 15;
      const diffMs = now.getTime() - expectedTime.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins > grace) {
        status = 'LATE';
        lateMinutes = diffMins;
      }
    }

    return prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      update: {
        checkIn: now,
        status,
        lateMinutes,
        shiftId: employee.shiftId,
      },
      create: {
        employeeId,
        shiftId: employee.shiftId,
        date: today,
        checkIn: now,
        status,
        lateMinutes,
      },
      include: { employee: true },
    });
  }

  async recordCheckOut(employeeId: string, checkOutTime?: Date) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });
    if (!employee) throw new AppError('Employee not found', 404);

    const now = checkOutTime || new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const att = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    let workedHours = 0;
    let overtimeMinutes = 0;
    let earlyMinutes = 0;

    if (att?.checkIn) {
      const workedMs = now.getTime() - new Date(att.checkIn).getTime();
      workedHours = Math.max(0, workedMs / (1000 * 60 * 60));
    }

    // Overtime calculation
    if (employee.shift?.endTime) {
      const parts = employee.shift.endTime.split(':');
      const shH = Number(parts[0]) || 17;
      const shM = Number(parts[1]) || 0;
      const shiftEndTime = new Date(today);
      shiftEndTime.setHours(shH, shM, 0, 0);

      const diffMs = now.getTime() - shiftEndTime.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins > 0) {
        overtimeMinutes = diffMins;
      } else if (diffMins < -15) {
        earlyMinutes = Math.abs(diffMins);
      }
    }

    return prisma.attendance.update({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      data: {
        checkOut: now,
        workedHours: Number(workedHours.toFixed(2)),
        overtimeMinutes,
        earlyMinutes,
      },
      include: { employee: true },
    });
  }

  // ==========================================
  // 6. LEAVES & PERMISSIONS
  // ==========================================
  async listLeaves(orgId: string, { employeeId, status }: any) {
    const where: any = {
      employee: { organizationId: orgId },
    };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    return prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { include: { department: true, position: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLeaveRequest(data: any) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        leaveType: data.leaveType || 'ANNUAL',
        startDate: start,
        endDate: end,
        totalDays: diffDays,
        reason: data.reason || null,
      },
      include: { employee: true },
    });
  }

  async updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED', approvedById: string, notes?: string) {
    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedById,
        approvedAt: new Date(),
        notes: notes || null,
      },
    });
  }

  // ==========================================
  // 7. ADVANCES, BONUSES & DEDUCTIONS
  // ==========================================
  async listAdvances(orgId: string, { employeeId, month, status }: any) {
    const where: any = { employee: { organizationId: orgId } };
    if (employeeId) where.employeeId = employeeId;
    if (month) where.deductMonth = month;
    if (status) where.status = status;

    return prisma.salaryAdvance.findMany({
      where,
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSalaryAdvance(data: any, approvedById?: string) {
    return prisma.salaryAdvance.create({
      data: {
        employeeId: data.employeeId,
        amount: Number(data.amount),
        deductMonth: data.deductMonth || new Date().toISOString().slice(0, 7),
        notes: data.notes || null,
        approvedById: approvedById || null,
      },
      include: { employee: true },
    });
  }

  async listAdjustments(orgId: string, { employeeId, month, type }: any) {
    const where: any = { employee: { organizationId: orgId } };
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = month;
    if (type) where.type = type;

    return prisma.employeeAdjustment.findMany({
      where,
      include: { employee: true },
      orderBy: { date: 'desc' },
    });
  }

  async createAdjustment(data: any) {
    return prisma.employeeAdjustment.create({
      data: {
        employeeId: data.employeeId,
        type: data.type, // BONUS, DEDUCTION, COMMISSION, OVERTIME_PAY, PENALTY, INCENTIVE
        amount: Number(data.amount),
        month: data.month || new Date().toISOString().slice(0, 7),
        reason: data.reason || null,
      },
      include: { employee: true },
    });
  }

  // ==========================================
  // 8. PAYROLL GENERATION & CALCULATION ENGINE
  // ==========================================
  /**
   * Complete Payroll Calculation Flow:
   * Basic Salary + Allowances + Bonuses + Overtime + Commissions - Deductions - Advance - Insurance = Net Salary
   */
  async generatePayroll(orgId: string, branchId: string, month: string, userId: string) {
    // 1. Check if payroll already exists for this branch and month
    const existing = await prisma.payroll.findUnique({
      where: { branchId_month: { branchId, month } },
      include: { items: true },
    });
    if (existing && existing.status === 'PAID') {
      throw new AppError('تم اعتماد وصرف مسير رواتب هذا الشهر بالفعل ولا يمكن إعادة إنشائه', 400);
    }

    // 2. Fetch all active employees in this branch
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, branchId, status: 'ACTIVE' },
      include: {
        salaryStructure: true,
        attendances: {
          where: {
            date: {
              gte: new Date(`${month}-01T00:00:00.000Z`),
              lte: new Date(`${month}-31T23:59:59.999Z`),
            },
          },
        },
        advances: {
          where: { deductMonth: month, isDeducted: false, status: 'APPROVED' },
        },
        bonusDeductions: {
          where: { month, isProcessed: false },
        },
      },
    });

    if (employees.length === 0) {
      throw new AppError('لا يوجد موظفون نشطون في هذا الفرع لإنشاء مسير الرواتب لهم', 400);
    }

    const payrollNumber = `PAY-${month}-${Date.now().toString().slice(-4)}`;

    return prisma.$transaction(async (tx) => {
      // If draft exists, delete previous items
      if (existing) {
        await tx.payrollItem.deleteMany({ where: { payrollId: existing.id } });
        await tx.payroll.delete({ where: { id: existing.id } });
      }

      let grandGross = 0;
      let grandBonuses = 0;
      let grandOvertime = 0;
      let grandCommissions = 0;
      let grandDeductions = 0;
      let grandAdvances = 0;
      let grandNet = 0;

      const payrollItemsData: any[] = [];

      for (const emp of employees) {
        const sal = emp.salaryStructure || {
          basicSalary: 0,
          housingAllowance: 0,
          transportAllowance: 0,
          otherAllowances: 0,
          socialInsurance: 0,
          overtimeHourRate: 0,
        };

        const basicSalary = sal.basicSalary || 0;
        const allowances = (sal.housingAllowance || 0) + (sal.transportAllowance || 0) + (sal.otherAllowances || 0);

        // Sum overtime hours from attendance
        const totalOvertimeMins = emp.attendances.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0);
        const overtimeHours = totalOvertimeMins / 60;
        const overtimeRate = sal.overtimeHourRate || (basicSalary > 0 ? (basicSalary / 240) * 1.5 : 0);
        const overtimeAmount = Number((overtimeHours * overtimeRate).toFixed(2));

        // Adjustments: Bonuses, Deductions, Commissions
        let bonuses = 0;
        let deductions = 0;
        let commissions = 0;

        for (const adj of emp.bonusDeductions) {
          if (adj.type === 'BONUS' || adj.type === 'INCENTIVE') bonuses += adj.amount;
          else if (adj.type === 'DEDUCTION' || adj.type === 'PENALTY') deductions += adj.amount;
          else if (adj.type === 'COMMISSION') commissions += adj.amount;
        }

        // Sum Advances
        const advanceDeduction = emp.advances.reduce((sum, adv) => sum + adv.amount, 0);
        const insuranceDeduction = sal.socialInsurance || 0;

        // Net Calculation
        const gross = basicSalary + allowances + bonuses + overtimeAmount + commissions;
        const totalEmployeeDeductions = deductions + advanceDeduction + insuranceDeduction;
        const netSalary = Math.max(0, gross - totalEmployeeDeductions);

        grandGross += gross;
        grandBonuses += bonuses;
        grandOvertime += overtimeAmount;
        grandCommissions += commissions;
        grandDeductions += deductions;
        grandAdvances += advanceDeduction;
        grandNet += netSalary;

        payrollItemsData.push({
          employeeId: emp.id,
          basicSalary,
          allowances,
          bonuses,
          overtimeAmount,
          commissions,
          deductions,
          advanceDeduction,
          insuranceDeduction,
          netSalary,
          status: 'PENDING',
        });
      }

      const payroll = await tx.payroll.create({
        data: {
          payrollNumber,
          organizationId: orgId,
          branchId,
          month,
          totalGross: grandGross,
          totalBonuses: grandBonuses,
          totalOvertime: grandOvertime,
          totalCommissions: grandCommissions,
          totalDeductions: grandDeductions,
          totalAdvances: grandAdvances,
          totalNet: grandNet,
          status: 'DRAFT',
          items: {
            create: payrollItemsData,
          },
        },
        include: {
          items: { include: { employee: { include: { position: true, department: true } } } },
        },
      });

      return payroll;
    });
  }

  async listPayrolls(orgId: string, { branchId, month }: any) {
    const where: any = { organizationId: orgId };
    if (branchId) where.branchId = branchId;
    if (month) where.month = month;

    return prisma.payroll.findMany({
      where,
      include: {
        branch: true,
        _count: { select: { items: true } },
      },
      orderBy: { month: 'desc' },
    });
  }

  async getPayrollById(id: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        branch: true,
        items: {
          include: {
            employee: {
              include: { position: true, department: true },
            },
          },
        },
      },
    });
    if (!payroll) throw new AppError('Payroll not found', 404);
    return payroll;
  }

  async approveAndPayPayroll(id: string, paymentMethod: string, userId: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!payroll) throw new AppError('Payroll not found', 404);
    if (payroll.status === 'PAID') throw new AppError('Payroll already approved and paid', 400);

    return prisma.$transaction(async (tx) => {
      // 1. Update Payroll status
      const updated = await tx.payroll.update({
        where: { id },
        data: {
          status: 'PAID',
          paymentMethod,
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      // 2. Mark Advances as deducted
      for (const item of payroll.items) {
        await tx.salaryAdvance.updateMany({
          where: { employeeId: item.employeeId, deductMonth: payroll.month },
          data: { isDeducted: true, status: 'DEDUCTED' },
        });

        await tx.employeeAdjustment.updateMany({
          where: { employeeId: item.employeeId, month: payroll.month },
          data: { isProcessed: true },
        });
      }

      createAuditLog({
        userId,
        branchId: payroll.branchId,
        entityType: 'Payroll',
        entityId: id,
        action: 'approve_and_pay',
        afterData: updated,
      });

      return updated;
    });
  }

  // ==========================================
  // 9. HR DASHBOARD STATS
  // ==========================================
  async getHrDashboard(orgId: string, branchId?: string) {
    const whereBranch = branchId ? { branchId } : {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      departmentsCount,
      activeLeaves,
      todayAttendances,
      pendingAdvances,
      lastPayroll,
    ] = await Promise.all([
      prisma.employee.count({ where: { organizationId: orgId, ...whereBranch, status: 'ACTIVE' } }),
      prisma.department.count({ where: { organizationId: orgId } }),
      prisma.leaveRequest.count({
        where: {
          employee: { organizationId: orgId, ...whereBranch },
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      prisma.attendance.findMany({
        where: {
          employee: { organizationId: orgId, ...whereBranch },
          date: today,
        },
      }),
      prisma.salaryAdvance.count({
        where: { employee: { organizationId: orgId, ...whereBranch }, status: 'PENDING' },
      }),
      prisma.payroll.findFirst({
        where: { organizationId: orgId, ...whereBranch },
        orderBy: { month: 'desc' },
        include: { branch: true },
      }),
    ]);

    const presentCount = todayAttendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const lateCount = todayAttendances.filter((a) => a.status === 'LATE').length;
    const absentCount = Math.max(0, totalEmployees - presentCount - activeLeaves);

    return {
      totalEmployees,
      departmentsCount,
      presentToday: presentCount,
      lateToday: lateCount,
      absentToday: absentCount,
      onLeaveToday: activeLeaves,
      pendingAdvances,
      lastPayroll,
    };
  }
}
