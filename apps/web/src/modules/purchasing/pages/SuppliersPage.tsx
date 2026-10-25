import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [statementSupplier, setStatementSupplier] = useState<any>(null);

  // Supplier Form
  const [form, setForm] = useState({
    supplierCode: '',
    nameAr: '',
    nameEn: '',
    categoryId: '',
    contactPerson: '',
    phone: '',
    email: '',
    taxNumber: '',
    commercialReg: '',
    address: '',
    city: 'Cairo',
    paymentTerms: 'NET_30',
    creditLimit: 0,
    notes: '',
  });

  // Category Form
  const [catForm, setCatForm] = useState({
    code: '',
    nameAr: '',
    nameEn: '',
    description: '',
  });

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/categories');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Suppliers
  const { data: suppliersData, isLoading, refetch } = useQuery({
    queryKey: ['suppliers-list', search, categoryId],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/suppliers', {
        params: { search: search || undefined, categoryId: categoryId || undefined, limit: 100 },
      });
      return res?.data?.data || res?.data;
    },
  });

  // Fetch Statement
  const { data: statementData, isLoading: loadingStatement } = useQuery({
    queryKey: ['supplier-statement', statementSupplier?.id],
    queryFn: async () => {
      if (!statementSupplier) return null;
      const res: any = await apiClient.get(`/purchasing/suppliers/${statementSupplier.id}/statement`);
      return res?.data?.data || res?.data;
    },
    enabled: !!statementSupplier,
  });

  // Mutations
  const saveSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingSupplier) {
        return apiClient.put(`/purchasing/suppliers/${editingSupplier.id}`, payload);
      }
      return apiClient.post('/purchasing/suppliers', payload);
    },
    onSuccess: () => {
      alert(editingSupplier ? 'تم تحديث بيانات المورد بنجاح' : 'تم إضافة المورد بنجاح');
      setShowAddModal(false);
      setEditingSupplier(null);
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل حفظ بيانات المورد');
    },
  });

  const saveCatMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/purchasing/categories', payload);
    },
    onSuccess: () => {
      alert('تم إنشاء تصنيف الموردين بنجاح');
      setShowCatModal(false);
      setCatForm({ code: '', nameAr: '', nameEn: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل إضافة التصنيف');
    },
  });

  const handleOpenEdit = (sup: any) => {
    setEditingSupplier(sup);
    setForm({
      supplierCode: sup.supplierCode || '',
      nameAr: sup.nameAr || '',
      nameEn: sup.nameEn || '',
      categoryId: sup.categoryId || '',
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      taxNumber: sup.taxNumber || '',
      commercialReg: sup.commercialReg || '',
      address: sup.address || '',
      city: sup.city || 'Cairo',
      paymentTerms: sup.paymentTerms || 'NET_30',
      creditLimit: sup.creditLimit || 0,
      notes: sup.notes || '',
    });
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setForm({
      supplierCode: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      nameAr: '',
      nameEn: '',
      categoryId: categoriesData?.[0]?.id || '',
      contactPerson: '',
      phone: '',
      email: '',
      taxNumber: '',
      commercialReg: '',
      address: '',
      city: 'Cairo',
      paymentTerms: 'NET_30',
      creditLimit: 0,
      notes: '',
    });
    setShowAddModal(true);
  };

  const suppliers = suppliersData?.data || suppliersData || [];

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">دليل الموردين والحسابات (Suppliers)</h3>
          <p className="text-muted mb-0">إدارة بيانات الموردين، تصنيفاتهم، كشوفات الحساب، والأرصدة المستحقة</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => setShowCatModal(true)}>
            <i className="bi bi-tags me-1"></i> تصنيفات الموردين
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <i className="bi bi-plus-circle me-1"></i> إضافة مورد جديد
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-search text-muted"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ابحث باسم المورد، كود المورد، رقم الهاتف، أو اسم المسؤول..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">جميع تصنيفات الموردين</option>
                {(categoriesData || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nameAr || c.nameEn}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 text-end">
              <span className="text-muted small">إجمالي الموردين: <strong>{suppliers.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th>كود المورد</th>
                  <th className="text-start">اسم المورد / الشركة</th>
                  <th>التصنيف</th>
                  <th>المسؤول والهاتف</th>
                  <th>الرصيد المستحق (له)</th>
                  <th>شروط الدفع</th>
                  <th>العمليات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-4 text-center"><div className="spinner-border spinner-border-sm text-primary me-2"></div>جاري تحميل الموردين...</td></tr>
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan={7} className="py-5 text-muted text-center">لا توجد بيانات موردين مطابقة. اضغط "إضافة مورد جديد" للبدء.</td></tr>
                ) : (
                  suppliers.map((sup: any) => (
                    <tr key={sup.id}>
                      <td className="fw-bold font-monospace text-primary">{sup.supplierCode}</td>
                      <td className="text-start">
                        <div className="fw-bold text-dark">{sup.nameAr || sup.nameEn}</div>
                        {sup.nameEn && sup.nameAr && <div className="text-muted small">{sup.nameEn}</div>}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {sup.category?.nameAr || sup.category?.nameEn || 'عام'}
                        </span>
                      </td>
                      <td>
                        <div>{sup.contactPerson || '—'}</div>
                        <div className="text-muted font-monospace small">{sup.phone}</div>
                      </td>
                      <td>
                        <span className={`fw-bold font-monospace ${sup.currentBalance > 0 ? 'text-danger' : 'text-success'}`}>
                          {(sup.currentBalance || 0).toFixed(2)} ج.م
                        </span>
                        {sup.currentBalance > 0 && <div className="text-danger small" style={{ fontSize: '0.72rem' }}>مستحق له</div>}
                      </td>
                      <td><span className="badge bg-secondary-subtle text-secondary">{sup.paymentTerms}</span></td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-info"
                            title="كشف حساب المورد"
                            onClick={() => setStatementSupplier(sup)}
                          >
                            <i className="bi bi-file-earmark-spreadsheet me-1"></i> كشف حساب
                          </button>
                          <button
                            className="btn btn-outline-primary"
                            title="تعديل بيانات المورد"
                            onClick={() => handleOpenEdit(sup)}
                          >
                            <i className="bi bi-pencil"></i>
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

      {/* Modal: Add/Edit Supplier */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered my-4">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  {editingSupplier ? 'تعديل بيانات مورد' : 'إضافة مورد جديد'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                saveSupplierMutation.mutate(form);
              }}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">كود المورد *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.supplierCode}
                        onChange={(e) => setForm({ ...form, supplierCode: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">اسم المورد (عربي) *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.nameAr}
                        onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">اسم المورد (إنجليزي)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.nameEn}
                        onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">تصنيف المورد</label>
                      <select
                        className="form-select"
                        value={form.categoryId}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      >
                        <option value="">-- اختر التصنيف --</option>
                        {(categoriesData || []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.nameAr || c.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">اسم الشخص المسؤول</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.contactPerson}
                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">رقم الهاتف / الموبايل *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">البريد الإلكتروني</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">الرقم الضريبي</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.taxNumber}
                        onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">السجل التجاري</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.commercialReg}
                        onChange={(e) => setForm({ ...form, commercialReg: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">شروط الدفع (Payment Terms)</label>
                      <select
                        className="form-select"
                        value={form.paymentTerms}
                        onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                      >
                        <option value="CASH">نقدي فور الاستلام (Cash)</option>
                        <option value="NET_15">آجل 15 يوم (Net 15)</option>
                        <option value="NET_30">آجل 30 يوم (Net 30)</option>
                        <option value="NET_60">آجل 60 يوم (Net 60)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">الحد الائتماني (ج.م)</label>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        value={form.creditLimit}
                        onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">المدينة / المحافظة</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">العنوان التفصيلي</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">ملاحظات</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary fw-bold" disabled={saveSupplierMutation.isPending}>
                    {saveSupplierMutation.isPending ? 'جاري الحفظ...' : 'حفظ المورد'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Supplier Categories Management */}
      {showCatModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">تصنيفات الموردين (Supplier Categories)</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCatModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Add Category Form */}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  saveCatMutation.mutate(catForm);
                }} className="mb-4 p-3 border rounded bg-light">
                  <h6 className="fw-bold mb-2">إضافة تصنيف جديد</h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <input
                        type="text"
                        placeholder="اسم التصنيف (عربي)"
                        className="form-control form-control-sm"
                        required
                        value={catForm.nameAr}
                        onChange={(e) => setCatForm({ ...catForm, nameAr: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <input
                        type="text"
                        placeholder="الكود (اختياري)"
                        className="form-control form-control-sm"
                        value={catForm.code}
                        onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
                      />
                    </div>
                    <div className="col-12 mt-2">
                      <button type="submit" className="btn btn-sm btn-dark w-100" disabled={saveCatMutation.isPending}>
                        + إضافة التصنيف
                      </button>
                    </div>
                  </div>
                </form>

                {/* Categories List */}
                <h6 className="fw-bold mb-2">التصنيفات الحالية</h6>
                <ul className="list-group">
                  {(categoriesData || []).map((cat: any) => (
                    <li key={cat.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{cat.nameAr || cat.nameEn}</strong>
                        <span className="text-muted small ms-2">({cat.code})</span>
                      </div>
                      <span className="badge bg-primary rounded-pill">{cat._count?.suppliers || 0} مورد</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Supplier Statement & Running Ledger */}
      {statementSupplier && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered my-4" style={{ maxHeight: '90vh' }}>
            <div className="modal-content border-0 shadow-lg d-flex flex-column" style={{ maxHeight: '88vh' }}>
              <div className="modal-header bg-dark text-white flex-shrink-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-file-earmark-spreadsheet me-2 text-info"></i>
                  كشف حساب مورد تفصيلي — {statementSupplier.nameAr || statementSupplier.nameEn} ({statementSupplier.supplierCode})
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setStatementSupplier(null)}></button>
              </div>

              <div className="modal-body p-4 flex-grow-1 overflow-auto">
                {/* Supplier Info Strip */}
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="p-3 border rounded bg-light text-center">
                      <div className="text-muted small">إجمالي المشتريات منه</div>
                      <h5 className="fw-bold text-dark font-monospace mb-0">{(statementData?.totalPurchases || 0).toFixed(2)} ج.م</h5>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 border rounded bg-light text-center">
                      <div className="text-muted small">إجمالي المسدد له</div>
                      <h5 className="fw-bold text-success font-monospace mb-0">{(statementData?.totalPaid || 0).toFixed(2)} ج.م</h5>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 border rounded bg-light text-center">
                      <div className="text-muted small">إجمالي المرتجعات</div>
                      <h5 className="fw-bold text-warning font-monospace mb-0">{(statementData?.totalReturns || 0).toFixed(2)} ج.م</h5>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 border rounded bg-light text-center border-danger">
                      <div className="text-muted small">الرصيد الحالي المستحق للمورد</div>
                      <h5 className="fw-bold text-danger font-monospace mb-0">{(statementData?.currentBalance || 0).toFixed(2)} ج.م</h5>
                    </div>
                  </div>
                </div>

                {/* Ledger Table */}
                <h6 className="fw-bold mb-3">حركة الحساب والعمليات (Running Balance)</h6>
                <div className="table-responsive">
                  <table className="table table-bordered align-middle text-center mb-0" style={{ fontSize: '0.82rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th>التاريخ</th>
                        <th>نوع الحركة</th>
                        <th>رقم المرجع</th>
                        <th className="text-start">البيان والتفاصيل</th>
                        <th className="text-danger">مدين (سداد / مرتجع)</th>
                        <th className="text-success">دائن (فاتورة شراء)</th>
                        <th>الرصيد التراكمي (له)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingStatement ? (
                        <tr><td colSpan={7} className="py-4 text-center">جاري تحميل كشف الحساب...</td></tr>
                      ) : (statementData?.statement || []).length === 0 ? (
                        <tr><td colSpan={7} className="py-4 text-muted text-center">لا توجد حركات مسجلة لهذا المورد حتى الآن.</td></tr>
                      ) : (
                        (statementData?.statement || []).map((row: any, idx: number) => (
                          <tr key={row.id || idx}>
                            <td>{new Date(row.date).toLocaleDateString('ar-EG')}</td>
                            <td>
                              <span className={`badge ${row.type === 'INVOICE' ? 'bg-primary' : row.type === 'PAYMENT' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                {row.type === 'INVOICE' ? 'فاتورة' : row.type === 'PAYMENT' ? 'دفعة سداد' : 'مرتجع'}
                              </span>
                            </td>
                            <td className="font-monospace fw-bold">{row.referenceNo}</td>
                            <td className="text-start">{row.description}</td>
                            <td className="font-monospace text-danger fw-semibold">{row.debit > 0 ? `${row.debit.toFixed(2)} ج.م` : '—'}</td>
                            <td className="font-monospace text-success fw-semibold">{row.credit > 0 ? `${row.credit.toFixed(2)} ج.م` : '—'}</td>
                            <td className="font-monospace fw-bold">{row.balance.toFixed(2)} ج.م</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setStatementSupplier(null)}>إغلاق</button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  <i className="bi bi-printer me-1"></i> طباعة كشف الحساب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
