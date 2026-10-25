import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import { Link } from 'react-router-dom';

export default function HrDashboardPage() {
  const { activeBranchId, hasPermission } = useAuth();
  const canViewSalary = hasPermission('hr.view_salary');

  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['hr-dashboard', activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/dashboard', {
        params: { branchId: activeBranchId || undefined }
      });
      return res?.data?.data || res?.data;
    }
  });

  const stats = dashboardData || {
    employeesCount: 0,
    departmentsCount: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    pendingLeaves: 0,
    pendingAdvances: 0,
    monthlyPayrollCost: 0,
    todayAttendanceList: []
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">الموارد البشرية والرواتب (HR & Payroll)</h3>
          <p className="text-muted mb-0">متابعة الحضور والانصراف، شؤون الموظفين، الإجازات ومسير الرواتب الشهرية</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/hr/attendance" className="btn btn-outline-primary">
            <i className="bi bi-clock-history me-1"></i> تسجيل الحضور اليومي
          </Link>
          <Link to="/hr/employees" className="btn btn-primary">
            <i className="bi bi-person-plus me-1"></i> دليل الموظفين
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-primary border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">إجمالي الموظفين</span>
                <div className="bg-primary-subtle text-primary p-2 rounded">
                  <i className="bi bi-people-fill fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-1 font-monospace">
                {isLoading ? '...' : (stats.employeesCount || 0)} <small className="fs-6 text-muted">موظف</small>
              </h4>
              <span className="text-muted small">موزعين على {stats.departmentsCount || 0} أقسام</span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">حضور اليوم</span>
                <div className="bg-success-subtle text-success p-2 rounded">
                  <i className="bi bi-check-circle-fill fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-success mb-1 font-monospace">
                {isLoading ? '...' : (stats.presentToday || 0)} <small className="fs-6 text-muted">حاضر</small>
              </h4>
              <div className="d-flex gap-2 small text-muted">
                <span className="text-warning"><i className="bi bi-clock-history"></i> متأخر: {stats.lateToday || 0}</span>
                <span className="text-danger ms-2"><i className="bi bi-x-circle"></i> غياب: {stats.absentToday || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-warning border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">طلبات الإجازات والسلف</span>
                <div className="bg-warning-subtle text-warning p-2 rounded">
                  <i className="bi bi-hourglass-split fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-warning mb-1 font-monospace">
                {isLoading ? '...' : (stats.pendingLeaves + stats.pendingAdvances || 0)} <small className="fs-6 text-muted">معلقة</small>
              </h4>
              <span className="text-muted small">إجازات: {stats.pendingLeaves || 0} | سلف: {stats.pendingAdvances || 0}</span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-info border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">تكلفة الرواتب التقديرية</span>
                <div className="bg-info-subtle text-info p-2 rounded">
                  <i className="bi bi-cash-stack fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-1 font-monospace">
                {canViewSalary 
                  ? (isLoading ? '...' : (stats.monthlyPayrollCost || 0).toLocaleString() + ' ج.م')
                  : '••••••••'}
              </h4>
              <span className="text-muted small">
                {canViewSalary ? 'الشهر الحالي' : 'مخفي (يتطلب صلاحية hr.view_salary)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="row g-4">
        {/* Attendance Summary Table */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-person-check text-primary me-2"></i> سجل حضور اليوم ({new Date().toLocaleDateString('ar-EG')})
              </h5>
              <Link to="/hr/attendance" className="btn btn-sm btn-outline-secondary">
                عرض الكل <i className="bi bi-arrow-left ms-1"></i>
              </Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">الموظف</th>
                      <th>القسم</th>
                      <th>حضور</th>
                      <th>انصراف</th>
                      <th>تأخير</th>
                      <th>إضافي</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={7} className="text-center py-4">جاري التحميل...</td></tr>
                    ) : (stats.todayAttendanceList || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          لا توجد تسجيلات حضور حتى الآن لليوم
                        </td>
                      </tr>
                    ) : (
                      (stats.todayAttendanceList || []).slice(0, 7).map((att: any) => (
                        <tr key={att.id}>
                          <td className="ps-3 fw-bold">
                            {att.employee?.firstName} {att.employee?.lastName}
                            <span className="d-block text-muted small fw-normal">{att.employee?.employeeCode}</span>
                          </td>
                          <td>{att.employee?.department?.name || '-'}</td>
                          <td className="font-monospace text-primary">
                            {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="font-monospace text-muted">
                            {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td>
                            {att.lateMinutes > 0 ? (
                              <span className="badge bg-warning-subtle text-warning font-monospace">{att.lateMinutes} د</span>
                            ) : (
                              <span className="text-muted small">لا يوجد</span>
                            )}
                          </td>
                          <td>
                            {att.overtimeHours > 0 ? (
                              <span className="badge bg-info-subtle text-info font-monospace">{att.overtimeHours} س</span>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              att.status === 'PRESENT' ? 'bg-success' :
                              att.status === 'LATE' ? 'bg-warning text-dark' :
                              att.status === 'ABSENT' ? 'bg-danger' :
                              att.status === 'LEAVE' ? 'bg-info' : 'bg-secondary'
                            }`}>
                              {att.status === 'PRESENT' ? 'حاضر' :
                               att.status === 'LATE' ? 'متأخر' :
                               att.status === 'ABSENT' ? 'غائب' :
                               att.status === 'LEAVE' ? 'إجازة' : att.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Navigation */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-transparent border-0 py-3">
              <h5 className="fw-bold mb-0">روابط سريعة</h5>
            </div>
            <div className="card-body d-flex flex-column gap-2 pt-0">
              <Link to="/hr/employees" className="btn btn-outline-light text-dark text-start border p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary-subtle text-primary p-2 rounded">
                    <i className="bi bi-people fs-4"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">شؤون وملفات الموظفين</h6>
                    <small className="text-muted">البيانات الشخصية، العقود، والرواتب</small>
                  </div>
                </div>
                <i className="bi bi-chevron-left text-muted"></i>
              </Link>

              <Link to="/hr/attendance" className="btn btn-outline-light text-dark text-start border p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-success-subtle text-success p-2 rounded">
                    <i className="bi bi-calendar-check fs-4"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">دفتر الحضور والانصراف</h6>
                    <small className="text-muted">تسجيل الدخول، المغادرة، والورديات</small>
                  </div>
                </div>
                <i className="bi bi-chevron-left text-muted"></i>
              </Link>

              <Link to="/hr/payroll" className="btn btn-outline-light text-dark text-start border p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-info-subtle text-info p-2 rounded">
                    <i className="bi bi-wallet2 fs-4"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">مسير الرواتب (Payroll)</h6>
                    <small className="text-muted">حساب المستحقات، السلف والخصومات، والصرف</small>
                  </div>
                </div>
                <i className="bi bi-chevron-left text-muted"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
