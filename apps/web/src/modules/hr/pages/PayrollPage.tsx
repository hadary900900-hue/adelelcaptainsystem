import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function PayrollPage() {
  const { activeBranchId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canViewSalary = hasPermission('hr.view_salary');

  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [branchId, setBranchId] = useState(activeBranchId || '');

  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Queries
  const { data: payrolls = [], isLoading } = useQuery({
    queryKey: ['hr-payrolls', branchId, year],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/payrolls', {
        params: { branchId: branchId || undefined, year }
      });
      return res?.data?.data || res?.data || [];
    }
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return res?.data?.data || res?.data || [];
    }
  });

  // Generate Payroll Mutation
  const generateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/hr/payrolls/generate', payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['hr-payrolls'] });
      setIsGenerateModalOpen(false);
      const created = res?.data?.data || res?.data;
      if (created) {
        setSelectedPayroll(created);
      }
    }
  });

  // Approve Payroll Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.post(`/hr/payrolls/${id}/approve`);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['hr-payrolls'] });
      const updated = res?.data?.data || res?.data;
      setSelectedPayroll(updated);
    }
  });

  // Pay Payroll Mutation
  const payMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.post(`/hr/payrolls/${id}/pay`);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['hr-payrolls'] });
      const updated = res?.data?.data || res?.data;
      setSelectedPayroll(updated);
    }
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate({
      month: Number(month),
      year: Number(year),
      branchId: branchId || undefined,
    });
  };

  const currentDisplayedPayroll = selectedPayroll || payrolls[0] || null;

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">مسير الرواتب والأجور (Payroll Management)</h3>
          <p className="text-muted mb-0">
            توليد مسيرات الرواتب الشهرية آلياً وفق الحضور، الإضافي، المكافآت، الخصومات وسداد السلف
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsGenerateModalOpen(true)}>
          <i className="bi bi-calculator me-1"></i> إنشاء / احتساب مسير راتب جديد
        </button>
      </div>

      {/* Filter / Selector Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-3">
              <label className="form-label small fw-bold text-muted mb-1">السنة:</label>
              <select
                className="form-select"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-muted mb-1">الفرع:</label>
              <select
                className="form-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">جميع الفروع (شامل)</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6 text-end">
              <span className="text-muted small">
                {canViewSalary ? (
                  <span className="text-success"><i className="bi bi-shield-check"></i> صلاحية الرواتب مفعلة</span>
                ) : (
                  <span className="text-warning"><i className="bi bi-lock-fill"></i> الرواتب الحساسة مشفرة / محجوبة</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Payroll List + Detail */}
      <div className="row g-4">
        {/* Left column: List of monthly payrolls */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 py-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-journal-text text-primary me-2"></i> مسيرات سنة {year}
              </h5>
            </div>
            <div className="card-body p-2">
              {isLoading ? (
                <div className="text-center py-4">جاري التحميل...</div>
              ) : payrolls.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-cash-stack fs-1 d-block mb-2 text-secondary"></i>
                  لا توجد مسيرات رواتب منشأة لهذه السنة
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {payrolls.map((p: any) => {
                    const isSelected = currentDisplayedPayroll?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPayroll(p)}
                        className={`list-group-item list-group-item-action p-3 rounded mb-2 border ${
                          isSelected ? 'border-primary bg-primary-subtle text-primary fw-bold' : ''
                        }`}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fs-6">مسير شهر {p.month} / {p.year}</span>
                          <span className={`badge ${
                            p.status === 'PAID' ? 'bg-success' :
                            p.status === 'APPROVED' ? 'bg-info' : 'bg-warning text-dark'
                          }`}>
                            {p.status === 'PAID' ? 'مصروف' :
                             p.status === 'APPROVED' ? 'معتمد' : 'مسودة'}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center small text-muted">
                          <span>{p.branch?.name || 'الكل'}</span>
                          <span className="font-monospace fw-bold">
                            {canViewSalary ? `${p.totalNetSalary?.toLocaleString()} ج.م` : '••••••••'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Selected Payroll details & items */}
        <div className="col-lg-8">
          {currentDisplayedPayroll ? (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h5 className="fw-bold mb-1">
                    تفاصيل مسير: شهر {currentDisplayedPayroll.month} / {currentDisplayedPayroll.year}
                  </h5>
                  <span className="badge bg-secondary-subtle text-secondary me-2">
                    الفرع: {currentDisplayedPayroll.branch?.name || 'كل الفروع'}
                  </span>
                  <span className={`badge ${
                    currentDisplayedPayroll.status === 'PAID' ? 'bg-success' :
                    currentDisplayedPayroll.status === 'APPROVED' ? 'bg-info' : 'bg-warning text-dark'
                  }`}>
                    {currentDisplayedPayroll.status === 'PAID' ? 'تم الصرف والترحيل' :
                     currentDisplayedPayroll.status === 'APPROVED' ? 'معتمد وجاهز للصرف' : 'مسودة مسير'}
                  </span>
                </div>

                <div className="d-flex gap-2">
                  {currentDisplayedPayroll.status === 'DRAFT' && (
                    <button
                      className="btn btn-outline-info"
                      onClick={() => approveMutation.mutate(currentDisplayedPayroll.id)}
                      disabled={approveMutation.isPending}
                    >
                      <i className="bi bi-check-circle me-1"></i> اعتماد المسير
                    </button>
                  )}

                  {currentDisplayedPayroll.status === 'APPROVED' && (
                    <button
                      className="btn btn-success"
                      onClick={() => payMutation.mutate(currentDisplayedPayroll.id)}
                      disabled={payMutation.isPending}
                    >
                      <i className="bi bi-wallet2 me-1"></i> صرف الرواتب للموظفين
                    </button>
                  )}
                </div>
              </div>

              {/* Financial summary blocks */}
              <div className="card-body border-bottom bg-light">
                <div className="row g-3 text-center">
                  <div className="col-md-3">
                    <small className="text-muted d-block">إجمالي الأساسي</small>
                    <span className="fs-5 fw-bold font-monospace">
                      {canViewSalary ? `${currentDisplayedPayroll.totalBasicSalary?.toLocaleString()} ج.م` : '••••••••'}
                    </span>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">البدلات والإضافي والمكافآت</small>
                    <span className="fs-5 fw-bold text-success font-monospace">
                      {canViewSalary ? `+${(
                        (currentDisplayedPayroll.totalAllowances || 0) +
                        (currentDisplayedPayroll.totalOvertime || 0) +
                        (currentDisplayedPayroll.totalBonuses || 0) +
                        (currentDisplayedPayroll.totalCommissions || 0)
                      ).toLocaleString()} ج.م` : '••••••••'}
                    </span>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">الخصومات والسلف والتأمينات</small>
                    <span className="fs-5 fw-bold text-danger font-monospace">
                      {canViewSalary ? `-${(
                        (currentDisplayedPayroll.totalDeductions || 0) +
                        (currentDisplayedPayroll.totalAdvances || 0)
                      ).toLocaleString()} ج.م` : '••••••••'}
                    </span>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">صافي المستحق (Net)</small>
                    <span className="fs-5 fw-bold text-primary font-monospace">
                      {canViewSalary ? `${currentDisplayedPayroll.totalNetSalary?.toLocaleString()} ج.م` : '••••••••'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payroll Items Table (Per Employee Breakdown) */}
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 font-monospace" style={{ fontSize: '0.85rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3 font-sans">الموظف</th>
                        <th>الأساسي</th>
                        <th>البدلات</th>
                        <th>إضافي</th>
                        <th>مكافآت</th>
                        <th>عمولات</th>
                        <th>خصومات</th>
                        <th>سلف</th>
                        <th>تأمينات</th>
                        <th className="pe-3 fw-bold text-dark">الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentDisplayedPayroll.items || []).map((item: any) => (
                        <tr key={item.id}>
                          <td className="ps-3 font-sans fw-bold">
                            {item.employee?.firstName} {item.employee?.lastName}
                            <span className="d-block text-muted small fw-normal">{item.employee?.employeeCode}</span>
                          </td>
                          <td>{canViewSalary ? item.basicSalary?.toLocaleString() : '•••'}</td>
                          <td>{canViewSalary ? item.allowances?.toLocaleString() : '•••'}</td>
                          <td className="text-success">{canViewSalary ? `+${item.overtimePay?.toLocaleString()}` : '•••'}</td>
                          <td className="text-success">{canViewSalary ? `+${item.bonuses?.toLocaleString()}` : '•••'}</td>
                          <td className="text-info">{canViewSalary ? `+${item.commissions?.toLocaleString()}` : '•••'}</td>
                          <td className="text-danger">{canViewSalary ? `-${item.deductions?.toLocaleString()}` : '•••'}</td>
                          <td className="text-danger">{canViewSalary ? `-${item.advanceDeduction?.toLocaleString()}` : '•••'}</td>
                          <td className="text-muted">{canViewSalary ? `-${item.insurance?.toLocaleString()}` : '•••'}</td>
                          <td className="pe-3 fw-bold text-primary fs-6">
                            {canViewSalary ? `${item.netSalary?.toLocaleString()} ج.م` : '••••••••'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm p-5 text-center text-muted">
              <i className="bi bi-arrow-up-circle fs-1 mb-2 text-primary"></i>
              قم باختيار أو إنشاء مسير رواتب لعرض التفاصيل
            </div>
          )}
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {isGenerateModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleGenerate}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">احتساب وتوليد مسير رواتب جديد</h5>
                  <button type="button" className="btn-close" onClick={() => setIsGenerateModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted small">
                    يقوم النظام بحساب الحضور والانصراف، ساعات التأخير والإضافي، تسويات المكافآت والخصومات المسجلة، وأقساط السلف تلقائياً لكل موظف.
                  </p>

                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold">الشهر *</label>
                      <select
                        className="form-select"
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>شهر {m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-bold">السنة *</label>
                      <select
                        className="form-select"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                      >
                        {[2024, 2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">الفرع (اختياري)</label>
                      <select
                        className="form-select"
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                      >
                        <option value="">جميع فروع المنشأة</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsGenerateModalOpen(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? 'جاري الاحتساب...' : 'بدء الاحتساب والتوليد'}
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
