import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function AttendancePage() {
  const { activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState(activeBranchId || '');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Check In/Out Form
  const [checkForm, setCheckForm] = useState({
    employeeId: '',
    type: 'IN', // IN or OUT
    notes: '',
  });

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    type: 'ANNUAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    daysCount: 1,
    reason: '',
  });

  // Queries
  const { data: attendanceList = [], isLoading } = useQuery({
    queryKey: ['hr-attendance', date, branchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/attendance', {
        params: {
          date: date || undefined,
          branchId: branchId || undefined,
        }
      });
      return res?.data?.data || res?.data || [];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['hr-employees-simple', branchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/employees', {
        params: { branchId: branchId || undefined }
      });
      return res?.data?.data || res?.data || [];
    }
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['hr-leaves', branchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/leaves', {
        params: { branchId: branchId || undefined }
      });
      return res?.data?.data || res?.data || [];
    }
  });

  // CheckIn / CheckOut Mutation
  const recordAttendanceMutation = useMutation({
    mutationFn: async (payload: { employeeId: string; type: string; notes?: string }) => {
      const endpoint = payload.type === 'IN' 
        ? `/hr/attendance/${payload.employeeId}/check-in`
        : `/hr/attendance/${payload.employeeId}/check-out`;
      return await apiClient.post(endpoint, { notes: payload.notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr-dashboard'] });
      setIsCheckInModalOpen(false);
      setCheckForm({ employeeId: '', type: 'IN', notes: '' });
    }
  });

  // Leave Mutation
  const createLeaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/hr/leaves', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-leaves'] });
      setIsLeaveModalOpen(false);
      setLeaveForm({
        employeeId: '',
        type: 'ANNUAL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        daysCount: 1,
        reason: '',
      });
    }
  });

  // Leave Status Update Mutation
  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiClient.patch(`/hr/leaves/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-leaves'] });
    }
  });

  const handleQuickCheck = (employeeId: string, type: 'IN' | 'OUT') => {
    recordAttendanceMutation.mutate({ employeeId, type });
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">دفتر الحضور والانصراف (Attendance & Shifts)</h3>
          <p className="text-muted mb-0">تسجيل ومتابعة حضور الموظفين، ساعات العمل، التأخير، والإضافي</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => setIsLeaveModalOpen(true)}>
            <i className="bi bi-calendar2-plus me-1"></i> تقديم طلب إجازة
          </button>
          <button className="btn btn-primary" onClick={() => setIsCheckInModalOpen(true)}>
            <i className="bi bi-clock-history me-1"></i> تسجيل حركة حضور / انصراف
          </button>
        </div>
      </div>

      {/* Date & Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted mb-1">تاريخ اليوم المحدد:</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted mb-1">الفرع:</label>
              <select
                className="form-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">جميع الفروع</option>
                <option value={activeBranchId || ''}>الفرع الحالي</option>
              </select>
            </div>
            <div className="col-md-4 text-end mt-4">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setDate(new Date().toISOString().split('T')[0])}
              >
                اليوم الحالي
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0">
            <i className="bi bi-card-checklist text-primary me-2"></i> سجل الحضور والانصراف لتاريخ ({date})
          </h5>
          <span className="badge bg-light text-dark border">
            إجمالي المسجلين: {attendanceList.length}
          </span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">الموظف</th>
                  <th>القسم</th>
                  <th>الوردية المحددة</th>
                  <th>وقت الدخول</th>
                  <th>وقت الخروج</th>
                  <th>التأخير</th>
                  <th>الانصراف المبكر</th>
                  <th>الساعات الإضافية</th>
                  <th>الحالة</th>
                  <th className="text-end pe-3">إجراء سريع</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="text-center py-4">جاري تحميل سجل الحضور...</td></tr>
                ) : attendanceList.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-4 text-muted">لا توجد حركات مسجلة لهذا اليوم حتى الآن</td></tr>
                ) : (
                  attendanceList.map((att: any) => (
                    <tr key={att.id}>
                      <td className="ps-3 fw-bold">
                        {att.employee?.firstName} {att.employee?.lastName}
                        <span className="d-block text-muted small fw-normal font-monospace">{att.employee?.employeeCode}</span>
                      </td>
                      <td>{att.employee?.department?.name || '-'}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {att.shift?.name || 'الوردية الصباحية الافتراضية'}
                        </span>
                      </td>
                      <td className="font-monospace text-primary fw-bold">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="font-monospace text-muted fw-bold">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td>
                        {att.lateMinutes > 0 ? (
                          <span className="badge bg-danger-subtle text-danger font-monospace">{att.lateMinutes} دقيقة</span>
                        ) : (
                          <span className="text-success small"><i className="bi bi-check2"></i> لا يوجد</span>
                        )}
                      </td>
                      <td>
                        {att.earlyLeaveMinutes > 0 ? (
                          <span className="badge bg-warning-subtle text-warning font-monospace">{att.earlyLeaveMinutes} دقيقة</span>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                      <td>
                        {att.overtimeHours > 0 ? (
                          <span className="badge bg-info-subtle text-info font-monospace">+{att.overtimeHours} ساعة</span>
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
                      <td className="text-end pe-3">
                        {!att.checkOut ? (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleQuickCheck(att.employeeId, 'OUT')}
                            disabled={recordAttendanceMutation.isPending}
                          >
                            <i className="bi bi-box-arrow-left me-1"></i> تسجيل خروج
                          </button>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">اكتمل اليوم</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Leave Requests Section */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 py-3">
          <h5 className="fw-bold mb-0">
            <i className="bi bi-calendar-check text-info me-2"></i> طلبات الإجازات والأذونات
          </h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">الموظف</th>
                  <th>نوع الإجازة</th>
                  <th>من تاريخ</th>
                  <th>إلى تاريخ</th>
                  <th>عدد الأيام</th>
                  <th>السبب</th>
                  <th>الحالة</th>
                  <th className="text-end pe-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">لا توجد طلبات إجازة حالية</td></tr>
                ) : (
                  leaves.map((leave: any) => (
                    <tr key={leave.id}>
                      <td className="ps-3 fw-bold">
                        {leave.employee?.firstName} {leave.employee?.lastName}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {leave.type === 'ANNUAL' ? 'سنوية' :
                           leave.type === 'SICK' ? 'مرضية' :
                           leave.type === 'EMERGENCY' ? 'عارضة' :
                           leave.type === 'PERMISSION' ? 'إذن ساعي' : leave.type}
                        </span>
                      </td>
                      <td>{new Date(leave.startDate).toLocaleDateString('ar-EG')}</td>
                      <td>{new Date(leave.endDate).toLocaleDateString('ar-EG')}</td>
                      <td className="font-monospace fw-bold">{leave.daysCount} يوم</td>
                      <td className="small text-muted">{leave.reason || '-'}</td>
                      <td>
                        <span className={`badge ${
                          leave.status === 'APPROVED' ? 'bg-success' :
                          leave.status === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark'
                        }`}>
                          {leave.status === 'APPROVED' ? 'مقبولة' :
                           leave.status === 'REJECTED' ? 'مرفوضة' : 'قيد المراجعة'}
                        </span>
                      </td>
                      <td className="text-end pe-3">
                        {leave.status === 'PENDING' && (
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-success"
                              onClick={() => updateLeaveStatusMutation.mutate({ id: leave.id, status: 'APPROVED' })}
                            >
                              <i className="bi bi-check-lg"></i> قبول
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => updateLeaveStatusMutation.mutate({ id: leave.id, status: 'REJECTED' })}
                            >
                              <i className="bi bi-x-lg"></i> رفض
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Check-in / Out Modal */}
      {isCheckInModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                recordAttendanceMutation.mutate(checkForm);
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">تسجيل حركة حضور / انصراف يدوية</h5>
                  <button type="button" className="btn-close" onClick={() => setIsCheckInModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">اختر الموظف *</label>
                    <select
                      className="form-select"
                      required
                      value={checkForm.employeeId}
                      onChange={(e) => setCheckForm({ ...checkForm, employeeId: e.target.value })}
                    >
                      <option value="">اختر الموظف...</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">نوع الحركة *</label>
                    <div className="btn-group w-100" role="group">
                      <button
                        type="button"
                        className={`btn ${checkForm.type === 'IN' ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => setCheckForm({ ...checkForm, type: 'IN' })}
                      >
                        <i className="bi bi-box-arrow-in-right me-1"></i> تسجيل حضور (Check-in)
                      </button>
                      <button
                        type="button"
                        className={`btn ${checkForm.type === 'OUT' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => setCheckForm({ ...checkForm, type: 'OUT' })}
                      >
                        <i className="bi bi-box-arrow-left me-1"></i> تسجيل انصراف (Check-out)
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">ملاحظات إضافية</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="اختياري..."
                      value={checkForm.notes}
                      onChange={(e) => setCheckForm({ ...checkForm, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsCheckInModalOpen(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={recordAttendanceMutation.isPending || !checkForm.employeeId}>
                    {recordAttendanceMutation.isPending ? 'جاري التسجيل...' : 'تأكيد التسجيل'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Submit Leave Modal */}
      {isLeaveModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                createLeaveMutation.mutate({
                  ...leaveForm,
                  daysCount: Number(leaveForm.daysCount),
                });
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">تقديم طلب إجازة أو إذن</h5>
                  <button type="button" className="btn-close" onClick={() => setIsLeaveModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">الموظف *</label>
                    <select
                      className="form-select"
                      required
                      value={leaveForm.employeeId}
                      onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                    >
                      <option value="">اختر الموظف...</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">نوع الإجازة *</label>
                    <select
                      className="form-select"
                      value={leaveForm.type}
                      onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                    >
                      <option value="ANNUAL">إجازة اعتيادية / سنوية</option>
                      <option value="SICK">إجازة مرضية</option>
                      <option value="EMERGENCY">إجازة عارضة</option>
                      <option value="UNPAID">إجازة بدون راتب</option>
                      <option value="PERMISSION">إذن ساعي</option>
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold">من تاريخ *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={leaveForm.startDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">إلى تاريخ *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={leaveForm.endDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">عدد الأيام *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0.5"
                      step="0.5"
                      required
                      value={leaveForm.daysCount}
                      onChange={(e) => setLeaveForm({ ...leaveForm, daysCount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">السبب / الملاحظات</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsLeaveModalOpen(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={createLeaveMutation.isPending || !leaveForm.employeeId}>
                    {createLeaveMutation.isPending ? 'جاري الإرسال...' : 'تقديم الطلب'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
