import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function ChartOfAccountsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const [form, setForm] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    type: 'ASSET',
    category: 'GENERAL',
    parentId: '',
    isDebit: true,
    description: '',
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts', search, typeFilter],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/accounts', {
        params: { search: search || undefined, type: typeFilter || undefined },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/accounting/accounts', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('تمت إضافة الحساب بنجاح');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'فشل إضافة الحساب');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await apiClient.put(`/accounting/accounts/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('تم تحديث الحساب بنجاح');
      setEditingAccount(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'فشل تحديث الحساب');
    },
  });

  const resetForm = () => {
    setForm({
      code: '',
      nameEn: '',
      nameAr: '',
      type: 'ASSET',
      category: 'GENERAL',
      parentId: '',
      isDebit: true,
      description: '',
    });
  };

  const handleOpenAdd = (parentAcc?: any) => {
    resetForm();
    if (parentAcc) {
      setForm(prev => ({
        ...prev,
        parentId: parentAcc.id,
        type: parentAcc.type,
        isDebit: parentAcc.isDebit,
      }));
    }
    setShowAddModal(true);
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'ASSET': return 'bg-success-subtle text-success border-success';
      case 'LIABILITY': return 'bg-danger-subtle text-danger border-danger';
      case 'EQUITY': return 'bg-info-subtle text-info border-info';
      case 'REVENUE': return 'bg-primary-subtle text-primary border-primary';
      case 'EXPENSE': return 'bg-warning-subtle text-warning border-warning';
      default: return 'bg-light text-dark';
    }
  };

  const typeAr = (type: string) => {
    switch (type) {
      case 'ASSET': return 'أصول';
      case 'LIABILITY': return 'التزامات (خصوم)';
      case 'EQUITY': return 'حقوق ملكية';
      case 'REVENUE': return 'إيرادات';
      case 'EXPENSE': return 'مصروفات / تكلفة';
      default: return type;
    }
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-diagram-3 text-primary me-2"></i>
            دليل وشجرة الحسابات (Chart of Accounts)
          </h3>
          <p className="text-muted mb-0">الهيكل المالي المتكامل للأصول، الخصوم، حقوق الملكية، الإيرادات والمصروفات</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenAdd()}>
          <i className="bi bi-plus-circle me-1"></i> إضافة حساب رئيسي / فرعي
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-search text-muted"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="بحث برقم الحساب أو الاسم بالعربية أو الإنجليزية..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">جميع أنواع الحسابات</option>
                <option value="ASSET">الأصول (Assets)</option>
                <option value="LIABILITY">الالتزامات والخصوم (Liabilities)</option>
                <option value="EQUITY">حقوق الملكية (Equity)</option>
                <option value="REVENUE">الإيرادات (Revenues)</option>
                <option value="EXPENSE">المصروفات والتكلفة (Expenses & COGS)</option>
              </select>
            </div>
            <div className="col-md-3 text-end d-flex align-items-center justify-content-end">
              <span className="text-muted small">إجمالي الحسابات: <strong>{accounts.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Tree / Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3" style={{ width: '120px' }}>كود الحساب</th>
                  <th>اسم الحساب (عربي / English)</th>
                  <th>النوع المالي</th>
                  <th>التصنيف</th>
                  <th>طبيعة الحساب</th>
                  <th>الرصيد الدفتري الحالي</th>
                  <th className="text-end pe-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-5">جاري تحميل شجرة الحسابات...</td></tr>
                ) : accounts.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-5 text-muted">لا توجد حسابات مطابقة للبحث</td></tr>
                ) : (
                  accounts.map((acc: any) => {
                    const indentPx = (acc.level - 1) * 24;
                    const isParent = acc.level < 3;
                    return (
                      <tr key={acc.id} className={isParent ? 'table-light' : ''}>
                        <td className="ps-3 font-monospace fw-bold text-primary">
                          {acc.code}
                        </td>
                        <td>
                          <div style={{ paddingRight: `${indentPx}px` }}>
                            <span className={`me-2 ${isParent ? 'fw-bold fs-6' : ''}`}>
                              {acc.nameAr}
                            </span>
                            <small className="text-muted d-block font-monospace" style={{ fontSize: '0.75rem' }}>
                              {acc.nameEn}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className={`badge border ${typeColor(acc.type)}`}>
                            {typeAr(acc.type)}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border small font-monospace">
                            {acc.category}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${acc.isDebit ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`}>
                            {acc.isDebit ? 'مدين (Debit)' : 'دائن (Credit)'}
                          </span>
                        </td>
                        <td className="font-monospace fw-bold">
                          {acc.currentBalance?.toLocaleString()} ج.م
                        </td>
                        <td className="text-end pe-3">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              title="إضافة حساب فرعي تحته"
                              onClick={() => handleOpenAdd(acc)}
                            >
                              <i className="bi bi-plus-lg"></i>
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              title="تعديل الحساب"
                              onClick={() => setEditingAccount(acc)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">إضافة حساب جديد</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">كود الحساب *</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        required
                        placeholder="مثال: 1108"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">النوع المالي *</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        <option value="ASSET">أصول (Asset)</option>
                        <option value="LIABILITY">التزامات / خصوم (Liability)</option>
                        <option value="EQUITY">حقوق ملكية (Equity)</option>
                        <option value="REVENUE">إيرادات (Revenue)</option>
                        <option value="EXPENSE">مصروفات / تكلفة (Expense)</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">الاسم بالعربية *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="مثال: نقدية فرع الشيخ زايد"
                        value={form.nameAr}
                        onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">الاسم بالإنجليزية *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Zayed Branch Cash Drawer"
                        value={form.nameEn}
                        onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">الحساب الأب (اختياري)</label>
                      <select
                        className="form-select"
                        value={form.parentId}
                        onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                      >
                        <option value="">بدون (حساب رئيسي)</option>
                        {accounts.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">الطبيعة الافتراضية *</label>
                      <select
                        className="form-select"
                        value={form.isDebit ? 'true' : 'false'}
                        onChange={(e) => setForm({ ...form, isDebit: e.target.value === 'true' })}
                      >
                        <option value="true">مدين (Debit)</option>
                        <option value="false">دائن (Credit)</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">الوصف / البيان</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الحساب'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingAccount.id,
                  payload: {
                    nameAr: editingAccount.nameAr,
                    nameEn: editingAccount.nameEn,
                    description: editingAccount.description,
                  },
                });
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">تعديل الحساب: {editingAccount.code}</h5>
                  <button type="button" className="btn-close" onClick={() => setEditingAccount(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">الاسم بالعربية *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editingAccount.nameAr}
                      onChange={(e) => setEditingAccount({ ...editingAccount, nameAr: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">الاسم بالإنجليزية *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editingAccount.nameEn}
                      onChange={(e) => setEditingAccount({ ...editingAccount, nameEn: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">الوصف</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={editingAccount.description || ''}
                      onChange={(e) => setEditingAccount({ ...editingAccount, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingAccount(null)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
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
