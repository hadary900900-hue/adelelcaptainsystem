import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function EmployeesPage() {
  const { activeBranchId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canViewSalary = hasPermission('hr.view_salary');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState(activeBranchId || '');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ nameAr: '', nameEn: '', code: '', description: '' });

  // Form states
  const [formData, setFormData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalId: '',
    hireDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    positionId: '',
    branchId: activeBranchId || '',
    basicSalary: 5000,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowance: 0,
    insuranceDeduction: 0,
    taxDeduction: 0,
  });

  const [advanceForm, setAdvanceForm] = useState({
    amount: 1000,
    installments: 1,
    notes: '',
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'BONUS', // BONUS, DEDUCTION, COMMISSION, OVERTIME
    amount: 500,
    reason: '',
  });

  // Queries
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['hr-employees', branchId, departmentId, search],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/employees', {
        params: {
          branchId: branchId || undefined,
          departmentId: departmentId || undefined,
          search: search || undefined,
        }
      });
      return res?.data?.data || res?.data || [];
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/departments');
      return res?.data?.data || res?.data || [];
    }
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['hr-positions', formData.departmentId],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/positions', {
        params: { departmentId: formData.departmentId || undefined }
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

  // Create Employee Mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/hr/employees', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      setIsAddModalOpen(false);
      resetForm();
    }
  });

  // Add Advance Mutation
  const addAdvanceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post(`/hr/employees/${selectedEmployee.id}/advances`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      setIsAdvanceModalOpen(false);
      setAdvanceForm({ amount: 1000, installments: 1, notes: '' });
      refreshProfile();
    }
  });

  // Add Adjustment Mutation
  const addAdjustmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post(`/hr/employees/${selectedEmployee.id}/adjustments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      setIsAdjustmentModalOpen(false);
      setAdjustmentForm({ type: 'BONUS', amount: 500, reason: '' });
      refreshProfile();
    }
  });

  // Create Department Mutation
  const createDeptMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/hr/departments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-departments'] });
      setIsDeptModalOpen(false);
      setDeptForm({ nameAr: '', nameEn: '', code: '', description: '' });
      alert('تم إضافة القسم بنجاح');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل إضافة القسم');
    }
  });

  const refreshProfile = async () => {
    if (!selectedEmployee) return;
    try {
      const res: any = await apiClient.get(`/hr/employees/${selectedEmployee.id}`);
      setSelectedEmployee(res?.data?.data || res?.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenProfile = async (emp: any) => {
    try {
      const res: any = await apiClient.get(`/hr/employees/${emp.id}`);
      setSelectedEmployee(res?.data?.data || res?.data || emp);
      setIsProfileModalOpen(true);
    } catch {
      setSelectedEmployee(emp);
      setIsProfileModalOpen(true);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationalId: '',
      hireDate: new Date().toISOString().split('T')[0],
      departmentId: '',
      positionId: '',
      branchId: activeBranchId || '',
      basicSalary: 5000,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
      insuranceDeduction: 0,
      taxDeduction: 0,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEmployeeMutation.mutate({
      ...formData,
      salaryStructure: {
        basicSalary: Number(formData.basicSalary) || 0,
        housingAllowance: Number(formData.housingAllowance) || 0,
        transportAllowance: Number(formData.transportAllowance) || 0,
        otherAllowance: Number(formData.otherAllowance) || 0,
        insuranceDeduction: Number(formData.insuranceDeduction) || 0,
        taxDeduction: Number(formData.taxDeduction) || 0,
      }
    });
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">دليل الموظفين والأقسام (Employees & Departments)</h3>
          <p className="text-muted mb-0">إدارة الأقسام الإدارية، بيانات الموظفين، الهيكل التنظيمي، والرواتب</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => setIsDeptModalOpen(true)}>
            <i className="bi bi-diagram-3 me-1"></i> إضافة قسم جديد
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <i className="bi bi-person-plus me-1"></i> إضافة موظف جديد
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-search text-muted"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="بحث بالاسم، الكود، الهاتف أو الرقم القومي..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">جميع الأقسام</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">جميع الفروع</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 text-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => { setSearch(''); setDepartmentId(''); setBranchId(''); }}
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">كود الموظف</th>
                  <th>الاسم الكامل</th>
                  <th>القسم / المنصب</th>
                  <th>الفرع</th>
                  <th>الهاتف</th>
                  <th>الراتب الأساسي</th>
                  <th>الحالة</th>
                  <th className="text-end pe-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-4">جاري تحميل بيانات الموظفين...</td></tr>
                ) : employeesData.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">لم يتم العثور على أي موظف مطابق للبحث</td></tr>
                ) : (
                  employeesData.map((emp: any) => (
                    <tr key={emp.id}>
                      <td className="ps-3 font-monospace fw-bold text-primary">{emp.employeeCode}</td>
                      <td>
                        <div className="fw-bold">{emp.firstName} {emp.lastName}</div>
                        <small className="text-muted">{emp.email || 'لا يوجد بريد'}</small>
                      </td>
                      <td>
                        <div>{emp.department?.name || '-'}</div>
                        <small className="text-muted">{emp.position?.title || '-'}</small>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{emp.branch?.name || 'المركز الرئيسي'}</span>
                      </td>
                      <td className="font-monospace">{emp.phone || '-'}</td>
                      <td className="font-monospace">
                        {canViewSalary && emp.salaryStructure ? (
                          <span className="fw-bold text-dark">{emp.salaryStructure.basicSalary.toLocaleString()} ج.م</span>
                        ) : (
                          <span className="text-muted">••••••••</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          emp.status === 'ACTIVE' ? 'bg-success' :
                          emp.status === 'ON_LEAVE' ? 'bg-warning text-dark' : 'bg-danger'
                        }`}>
                          {emp.status === 'ACTIVE' ? 'نشط' :
                           emp.status === 'ON_LEAVE' ? 'في إجازة' : 'متوقف'}
                        </span>
                      </td>
                      <td className="text-end pe-3">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleOpenProfile(emp)}
                            title="الملف الوظيفي والتاريخ"
                          >
                            <i className="bi bi-person-lines-fill me-1"></i> الملف
                          </button>
                          <button
                            className="btn btn-outline-warning"
                            onClick={() => { setSelectedEmployee(emp); setIsAdvanceModalOpen(true); }}
                            title="صرف سلفة"
                          >
                            <i className="bi bi-cash me-1"></i> سلفة
                          </button>
                          <button
                            className="btn btn-outline-info"
                            onClick={() => { setSelectedEmployee(emp); setIsAdjustmentModalOpen(true); }}
                            title="مكافأة أو خصم"
                          >
                            <i className="bi bi-plus-slash-minus me-1"></i> تسوية
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">إضافة موظف جديد</h5>
                  <button type="button" className="btn-close" onClick={() => setIsAddModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">الاسم الأول *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">اسم العائلة (اللقب) *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">رقم الهاتف *</label>
                      <input
                        type="tel"
                        className="form-control"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">الرقم القومي (National ID)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.nationalId}
                        onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">البريد الإلكتروني</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">تاريخ التعيين</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.hireDate}
                        onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">القسم</label>
                      <select
                        className="form-select"
                        value={formData.departmentId}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      >
                        <option value="">اختر القسم...</option>
                        {departments.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">المنصب الوظيفي</label>
                      <select
                        className="form-select"
                        value={formData.positionId}
                        onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                      >
                        <option value="">اختر المنصب...</option>
                        {positions.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">الفرع المخصص *</label>
                      <select
                        className="form-select"
                        required
                        value={formData.branchId}
                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      >
                        <option value="">اختر الفرع...</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 mt-4">
                      <h6 className="fw-bold text-primary border-bottom pb-2">
                        <i className="bi bi-cash-coin me-1"></i> هيكل الراتب والبدلات (Salary Structure)
                      </h6>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">الراتب الأساسي (ج.م) *</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        min="0"
                        value={formData.basicSalary}
                        onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">بدل سكن</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.housingAllowance}
                        onChange={(e) => setFormData({ ...formData, housingAllowance: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">بدل انتقال</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.transportAllowance}
                        onChange={(e) => setFormData({ ...formData, transportAllowance: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">بدلات أخرى</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.otherAllowance}
                        onChange={(e) => setFormData({ ...formData, otherAllowance: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">استقطاع التأمينات الاجتماعية</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.insuranceDeduction}
                        onChange={(e) => setFormData({ ...formData, insuranceDeduction: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">استقطاع كسب العمل / الضرائب</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.taxDeduction}
                        onChange={(e) => setFormData({ ...formData, taxDeduction: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={createEmployeeMutation.isPending}>
                    {createEmployeeMutation.isPending ? 'جاري الحفظ...' : 'حفظ الموظف'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Employee Full Profile Modal */}
      {isProfileModalOpen && selectedEmployee && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title fw-bold">
                    الملف الوظيفي: {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h5>
                  <span className="badge bg-primary me-2 font-monospace">{selectedEmployee.employeeCode}</span>
                  <span className="text-muted small">فرع: {selectedEmployee.branch?.name || '-'} | قسم: {selectedEmployee.department?.name || '-'}</span>
                </div>
                <button type="button" className="btn-close" onClick={() => setIsProfileModalOpen(false)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Employee Info Header Cards */}
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded">
                      <div className="text-muted small">المنصب الوظيفي</div>
                      <div className="fw-bold">{selectedEmployee.position?.title || 'غير محدد'}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded">
                      <div className="text-muted small">تاريخ التعيين</div>
                      <div className="fw-bold">{selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString('ar-EG') : '-'}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded">
                      <div className="text-muted small">الرقم القومي</div>
                      <div className="fw-bold font-monospace">{selectedEmployee.nationalId || '-'}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded">
                      <div className="text-muted small">إجمالي الراتب الأساسي والبدلات</div>
                      <div className="fw-bold font-monospace text-primary">
                        {canViewSalary && selectedEmployee.salaryStructure ? (
                          (selectedEmployee.salaryStructure.basicSalary +
                           selectedEmployee.salaryStructure.housingAllowance +
                           selectedEmployee.salaryStructure.transportAllowance +
                           selectedEmployee.salaryStructure.otherAllowance).toLocaleString() + ' ج.م'
                        ) : '••••••••'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs or Sections */}
                <ul className="nav nav-pills mb-3 border-bottom pb-2">
                  <li className="nav-item">
                    <span className="nav-link active">سجل الحضور الأخير</span>
                  </li>
                </ul>

                {/* Recent Attendance */}
                <div className="table-responsive mb-4">
                  <h6 className="fw-bold mb-2"><i className="bi bi-clock-history me-1"></i> آخر 10 أيام حضور</h6>
                  <table className="table table-bordered table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>التاريخ</th>
                        <th>وقت الحضور</th>
                        <th>وقت الانصراف</th>
                        <th>دقائق التأخير</th>
                        <th>ساعات إضافي</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedEmployee.attendances || []).length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted py-2">لا توجد سجلات حضور مسجلة</td></tr>
                      ) : (
                        selectedEmployee.attendances.map((att: any) => (
                          <tr key={att.id}>
                            <td>{new Date(att.date).toLocaleDateString('ar-EG')}</td>
                            <td className="font-monospace text-primary">
                              {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="font-monospace text-muted">
                              {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td>{att.lateMinutes > 0 ? `${att.lateMinutes} دقيقة` : '-'}</td>
                            <td>{att.overtimeHours > 0 ? `${att.overtimeHours} ساعة` : '-'}</td>
                            <td>
                              <span className={`badge ${att.status === 'PRESENT' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                {att.status === 'PRESENT' ? 'حاضر' : att.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Advances & Adjustments History */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-2"><i className="bi bi-cash-stack me-1"></i> السلف المالية (Advances)</h6>
                    <table className="table table-bordered table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>المبلغ</th>
                          <th>الأقساط</th>
                          <th>المتبقي</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedEmployee.advances || []).length === 0 ? (
                          <tr><td colSpan={4} className="text-center text-muted py-2">لا توجد سلف مالية</td></tr>
                        ) : (
                          selectedEmployee.advances.map((adv: any) => (
                            <tr key={adv.id}>
                              <td className="font-monospace">{adv.amount} ج.م</td>
                              <td>{adv.remainingInstallments} / {adv.installments}</td>
                              <td className="font-monospace fw-bold text-danger">{adv.remainingAmount} ج.م</td>
                              <td>
                                <span className={`badge ${adv.status === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                  {adv.status === 'PAID' ? 'تم السداد' : adv.status === 'ACTIVE' ? 'نشطة' : 'معلقة'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="col-md-6">
                    <h6 className="fw-bold mb-2"><i className="bi bi-sliders me-1"></i> المكافآت والخصومات والعمولات</h6>
                    <table className="table table-bordered table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>النوع</th>
                          <th>المبلغ</th>
                          <th>السبب</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedEmployee.adjustments || []).length === 0 ? (
                          <tr><td colSpan={4} className="text-center text-muted py-2">لا توجد تسويات حديثة</td></tr>
                        ) : (
                          selectedEmployee.adjustments.map((adj: any) => (
                            <tr key={adj.id}>
                              <td>
                                <span className={`badge ${
                                  adj.type === 'BONUS' ? 'bg-success' :
                                  adj.type === 'COMMISSION' ? 'bg-info' :
                                  adj.type === 'DEDUCTION' ? 'bg-danger' : 'bg-primary'
                                }`}>
                                  {adj.type === 'BONUS' ? 'مكافأة' :
                                   adj.type === 'COMMISSION' ? 'عمولة' :
                                   adj.type === 'DEDUCTION' ? 'خصم' : 'إضافي'}
                                </span>
                              </td>
                              <td className="font-monospace fw-bold">{adj.amount} ج.م</td>
                              <td className="small">{adj.reason || '-'}</td>
                              <td>{adj.applied ? <span className="badge bg-secondary">تم التطبيق</span> : <span className="badge bg-warning text-dark">معلق للمسير</span>}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsProfileModalOpen(false)}>إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {isAdvanceModalOpen && selectedEmployee && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                addAdvanceMutation.mutate({
                  amount: Number(advanceForm.amount),
                  installments: Number(advanceForm.installments),
                  notes: advanceForm.notes,
                });
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">صرف سلفة لـ {selectedEmployee.firstName} {selectedEmployee.lastName}</h5>
                  <button type="button" className="btn-close" onClick={() => setIsAdvanceModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">مبلغ السلفة (ج.م) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min="100"
                      value={advanceForm.amount}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">عدد شهور السداد (أقساط) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min="1"
                      max="12"
                      value={advanceForm.installments}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, installments: Number(e.target.value) })}
                    />
                    <small className="text-muted">القسط الشهري التقريبي: {((advanceForm.amount || 0) / (advanceForm.installments || 1)).toFixed(2)} ج.م</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">ملاحظات / سبب السلفة</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={advanceForm.notes}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAdvanceModalOpen(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-warning" disabled={addAdvanceMutation.isPending}>
                    {addAdvanceMutation.isPending ? 'جاري الصرف...' : 'اعتماد وصرف السلفة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {isAdjustmentModalOpen && selectedEmployee && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                addAdjustmentMutation.mutate({
                  type: adjustmentForm.type,
                  amount: Number(adjustmentForm.amount),
                  reason: adjustmentForm.reason,
                });
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">تسوية مالية لـ {selectedEmployee.firstName} {selectedEmployee.lastName}</h5>
                  <button type="button" className="btn-close" onClick={() => setIsAdjustmentModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">نوع التسوية *</label>
                    <select
                      className="form-select"
                      value={adjustmentForm.type}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value })}
                    >
                      <option value="BONUS">مكافأة تشجيعية (+)</option>
                      <option value="COMMISSION">عمولة مبيعات / صيانة (+)</option>
                      <option value="OVERTIME">إضافي استثنائي (+)</option>
                      <option value="DEDUCTION">خصم أو جزاء (-)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">المبلغ (ج.م) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min="1"
                      value={adjustmentForm.amount}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">السبب / البيان *</label>
                    <textarea
                      className="form-control"
                      required
                      rows={2}
                      placeholder="اكتب سبب الصرف أو الخصم..."
                      value={adjustmentForm.reason}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustmentModalOpen(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={addAdjustmentMutation.isPending}>
                    {addAdjustmentMutation.isPending ? 'جاري التطبيق...' : 'حفظ التسوية'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Department */}
      {isDeptModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-diagram-3 me-2"></i> إضافة قسم جديد في الموارد البشرية
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsDeptModalOpen(false)}></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createDeptMutation.mutate(deptForm);
                }}
              >
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">اسم القسم بالعربية *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="مثال: قسم الصيانة والورشة، قسم المبيعات، قسم الحسابات"
                      value={deptForm.nameAr}
                      onChange={(e) => setDeptForm({ ...deptForm, nameAr: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">اسم القسم بالإنجليزية (اختياري)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Workshop Dept, Sales Dept"
                      value={deptForm.nameEn}
                      onChange={(e) => setDeptForm({ ...deptForm, nameEn: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">كود القسم (اختياري)</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="مثال: DEP-WS, DEP-SALES (أو يترك فارغاً للإنشاء التلقائي)"
                      value={deptForm.code}
                      onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">وصف ومهام القسم</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="وصف مختصر لطبيعة عمل القسم..."
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsDeptModalOpen(false)}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold" disabled={createDeptMutation.isPending}>
                    {createDeptMutation.isPending ? 'جاري الحفظ...' : 'حفظ القسم الآن'}
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
