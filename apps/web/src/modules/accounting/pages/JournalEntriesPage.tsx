import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function JournalEntriesPage() {
  const { activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [branchId, setBranchId] = useState(activeBranchId || '');
  const [sourceType, setSourceType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [showReverseModal, setShowReverseModal] = useState(false);

  // Form State for Manual Journal Entry
  const [entryForm, setEntryForm] = useState<any>({
    branchId: activeBranchId || '',
    entryDate: new Date().toISOString().split('T')[0],
    narration: '',
    lines: [
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' },
    ],
  });

  // Fetch Accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-select'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/accounts');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Journal Entries
  const { data: entriesResponse, isLoading } = useQuery({
    queryKey: ['journal-entries-list', branchId, sourceType, startDate, endDate, search, page],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/journal-entries', {
        params: {
          branchId: branchId || undefined,
          sourceType: sourceType || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: search || undefined,
          page,
          limit: 30,
        },
      });
      return res?.data || {};
    },
  });

  const entries = entriesResponse?.data || [];
  const pagination = entriesResponse?.meta || { total: 0, totalPages: 1 };

  // Create Journal Entry Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/accounting/journal-entries', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries-list'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('تم ترحيل قيد اليومية بنجاح');
      setShowAddModal(false);
      resetEntryForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'فشل ترحيل القيد');
    },
  });

  // Reverse Journal Entry Mutation
  const reverseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiClient.post(`/accounting/journal-entries/${id}/reverse`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries-list'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('تم عكس وإلغاء القيد بنجاح وتسجيل قيد العكس');
      setShowReverseModal(false);
      setSelectedEntry(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'فشل عكس القيد');
    },
  });

  const resetEntryForm = () => {
    setEntryForm({
      branchId: activeBranchId || branches[0]?.id || '',
      entryDate: new Date().toISOString().split('T')[0],
      narration: '',
      lines: [
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' },
      ],
    });
  };

  const handleAddLine = () => {
    setEntryForm({
      ...entryForm,
      lines: [...entryForm.lines, { accountId: '', debit: 0, credit: 0, description: '' }],
    });
  };

  const handleRemoveLine = (index: number) => {
    if (entryForm.lines.length <= 2) {
      toast.error('يجب أن يحتوي القيد على سطرين على الأقل');
      return;
    }
    const updated = [...entryForm.lines];
    updated.splice(index, 1);
    setEntryForm({ ...entryForm, lines: updated });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...entryForm.lines];
    updated[index][field] = value;
    setEntryForm({ ...entryForm, lines: updated });
  };

  const formTotalDebit = entryForm.lines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
  const formTotalCredit = entryForm.lines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);
  const isFormBalanced = Math.abs(formTotalDebit - formTotalCredit) < 0.01 && formTotalDebit > 0;

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-journal-check text-primary me-2"></i>
            قيود اليومية العامة (Journal Entries)
          </h3>
          <p className="text-muted mb-0">سجل القيود المحاسبية الآلية واليدوية وحركات القيد المزدوج</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetEntryForm(); setShowAddModal(true); }}>
          <i className="bi bi-plus-circle me-1"></i> إنشاء قيد يومية يدوي
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="بحث برقم القيد أو البيان أو المرجع..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">جميع الفروع</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.nameAr || b.nameEn}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              >
                <option value="">جميع المصادر</option>
                <option value="MANUAL">قيد يدوي</option>
                <option value="SALES_INVOICE">فاتورة مبيعات</option>
                <option value="PURCHASE_INVOICE">فاتورة مشتريات</option>
                <option value="CUSTOMER_PAYMENT">سداد عميل</option>
                <option value="SUPPLIER_PAYMENT">سداد مورد</option>
                <option value="EXPENSE">مصروفات</option>
                <option value="PAYROLL">مسير رواتب</option>
              </select>
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="من تاريخ"
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="إلى تاريخ"
              />
            </div>
            <div className="col-md-1 text-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => { setSearch(''); setBranchId(''); setSourceType(''); setStartDate(''); setEndDate(''); }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th className="ps-3">رقم القيد</th>
                  <th>التاريخ</th>
                  <th>الفرع</th>
                  <th>البيان / الوصف</th>
                  <th>نوع المصدر</th>
                  <th>المرجع</th>
                  <th>إجمالي المدين</th>
                  <th>إجمالي الدائن</th>
                  <th>الحالة</th>
                  <th className="text-end pe-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="text-center py-5">جاري التحميل...</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-5 text-muted">لا توجد قيود مسجلة مطابقة للبحث</td></tr>
                ) : (
                  entries.map((entry: any) => (
                    <tr key={entry.id}>
                      <td className="ps-3 font-monospace fw-bold text-primary">
                        {entry.entryNumber}
                      </td>
                      <td>{new Date(entry.entryDate).toLocaleDateString('ar-EG')}</td>
                      <td>{entry.branch?.nameAr || entry.branch?.nameEn || 'الكل'}</td>
                      <td style={{ maxWidth: '280px' }} className="text-truncate">
                        {entry.narration}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {entry.sourceType}
                        </span>
                      </td>
                      <td className="font-monospace small">
                        {entry.sourceNumber || '—'}
                      </td>
                      <td className="font-monospace fw-bold text-success">
                        {entry.totalDebit?.toLocaleString()} ج.م
                      </td>
                      <td className="font-monospace fw-bold text-primary">
                        {entry.totalCredit?.toLocaleString()} ج.م
                      </td>
                      <td>
                        <span className={`badge ${
                          entry.status === 'POSTED' ? 'bg-success' :
                          entry.status === 'REVERSED' ? 'bg-danger' : 'bg-warning text-dark'
                        }`}>
                          {entry.status === 'POSTED' ? 'مرحل' :
                           entry.status === 'REVERSED' ? 'معكوس' : entry.status}
                        </span>
                      </td>
                      <td className="text-end pe-3">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            title="عرض تفاصيل القيد والأسطر"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          {entry.status === 'POSTED' && !entry.isReversed && (
                            <button
                              className="btn btn-outline-danger"
                              title="عكس القيد المحاسبي"
                              onClick={() => { setSelectedEntry(entry); setShowReverseModal(true); }}
                            >
                              <i className="bi bi-arrow-counterclockwise"></i>
                            </button>
                          )}
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

      {/* View Entry Details Modal */}
      {selectedEntry && !showReverseModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title fw-bold">تفاصيل قيد اليومية: {selectedEntry.entryNumber}</h5>
                  <small className="text-muted">
                    تاريخ القيد: {new Date(selectedEntry.entryDate).toLocaleDateString('ar-EG')} | الفرع: {selectedEntry.branch?.nameAr || selectedEntry.branch?.nameEn}
                  </small>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedEntry(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="p-3 bg-light rounded mb-3">
                  <div className="small text-muted mb-1">البيان / الوصف العام:</div>
                  <div className="fw-semibold">{selectedEntry.narration}</div>
                  <div className="d-flex gap-3 small text-muted mt-2">
                    <span>نوع المصدر: <strong>{selectedEntry.sourceType}</strong></span>
                    <span>المرجع: <strong className="font-monospace">{selectedEntry.sourceNumber || '—'}</strong></span>
                  </div>
                </div>

                <h6 className="fw-bold mb-2">أسطر القيد المزدوج:</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle font-monospace" style={{ fontSize: '0.85rem' }}>
                    <thead className="table-light font-sans">
                      <tr>
                        <th>كود الحساب</th>
                        <th>اسم الحساب</th>
                        <th>الوصف / البيان</th>
                        <th className="text-end">مدين (Debit)</th>
                        <th className="text-end">دائن (Credit)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedEntry.lines || []).map((line: any) => (
                        <tr key={line.id}>
                          <td className="fw-bold text-primary">{line.account?.code}</td>
                          <td className="font-sans">{line.account?.nameAr || line.account?.nameEn}</td>
                          <td className="font-sans small text-muted">{line.description}</td>
                          <td className="text-end fw-bold text-success">
                            {line.debit > 0 ? line.debit.toLocaleString() : '—'}
                          </td>
                          <td className="text-end fw-bold text-primary">
                            {line.credit > 0 ? line.credit.toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan={3} className="text-end font-sans">المجموع الإجمالي:</td>
                        <td className="text-end text-success">{selectedEntry.totalDebit?.toLocaleString()} ج.م</td>
                        <td className="text-end text-primary">{selectedEntry.totalCredit?.toLocaleString()} ج.م</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedEntry(null)}>إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reverse Entry Modal */}
      {showReverseModal && selectedEntry && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                reverseMutation.mutate({ id: selectedEntry.id, reason: reversalReason });
              }}>
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i> تأكيد عكس القيد المحاسبي
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowReverseModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p>
                    أنت على وشك عكس قيد اليومية رقم <strong>{selectedEntry.entryNumber}</strong> بقيمة <strong>{selectedEntry.totalDebit?.toLocaleString()} ج.م</strong>.
                  </p>
                  <p className="small text-muted">
                    وفقاً للأصول المحاسبية الرصينة، لن يتم حذف القيد القديم، بل سيقوم النظام بإنشاء قيد عكسي تلقائياً (قلب المدين دائن والدائن مدين) لضبط ميزان المراجعة والأرصدة بأثر رقابي كامل.
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">سبب العكس / الإلغاء *</label>
                    <textarea
                      className="form-control"
                      required
                      rows={2}
                      placeholder="اكتب سبب إلغاء القيد..."
                      value={reversalReason}
                      onChange={(e) => setReversalReason(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReverseModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-danger" disabled={reverseMutation.isPending || !reversalReason}>
                    {reverseMutation.isPending ? 'جاري العكس...' : 'تأكيد عكس القيد'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Manual Journal Entry Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!isFormBalanced) {
                  toast.error('القيد غير متوازن! يجب أن يتساوى إجمالي المدين مع إجمالي الدائن.');
                  return;
                }
                createMutation.mutate({
                  ...entryForm,
                  sourceType: 'MANUAL',
                });
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">إنشاء قيد يومية يدوي متوازن</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label small fw-bold">الفرع *</label>
                      <select
                        className="form-select"
                        required
                        value={entryForm.branchId}
                        onChange={(e) => setEntryForm({ ...entryForm, branchId: e.target.value })}
                      >
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.nameAr || b.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold">تاريخ القيد *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={entryForm.entryDate}
                        onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold">البيان العام للقيد *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="مثال: إثبات إيجار شهر أكتوبر أو تسوية أصول"
                        value={entryForm.narration}
                        onChange={(e) => setEntryForm({ ...entryForm, narration: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Lines Editor */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">أسطر القيد (حركات المدين والدائن):</h6>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAddLine}>
                      <i className="bi bi-plus-circle me-1"></i> إضافة سطر جديد
                    </button>
                  </div>

                  <div className="table-responsive mb-3">
                    <table className="table table-bordered align-middle">
                      <thead className="table-light small">
                        <tr>
                          <th style={{ width: '35%' }}>الحساب المالي *</th>
                          <th style={{ width: '18%' }}>مدين (Debit)</th>
                          <th style={{ width: '18%' }}>دائن (Credit)</th>
                          <th>شرح السطر</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryForm.lines.map((line: any, index: number) => (
                          <tr key={index}>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                required
                                value={line.accountId}
                                onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                              >
                                <option value="">-- اختر الحساب --</option>
                                {accounts.map((a: any) => (
                                  <option key={a.id} value={a.id}>
                                    {a.code} - {a.nameAr} ({a.type})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-select-sm font-monospace"
                                min="0"
                                step="0.01"
                                value={line.debit || ''}
                                onChange={(e) => handleLineChange(index, 'debit', Number(e.target.value))}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-select-sm font-monospace"
                                min="0"
                                step="0.01"
                                value={line.credit || ''}
                                onChange={(e) => handleLineChange(index, 'credit', Number(e.target.value))}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-select-sm"
                                placeholder="اختياري..."
                                value={line.description || ''}
                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                              />
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger border-0"
                                onClick={() => handleRemoveLine(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-light">
                        <tr className="fw-bold font-monospace">
                          <td className="text-end font-sans">المجموع:</td>
                          <td className="text-success">{formTotalDebit.toLocaleString()} ج.م</td>
                          <td className="text-primary">{formTotalCredit.toLocaleString()} ج.م</td>
                          <td colSpan={2}>
                            {isFormBalanced ? (
                              <span className="badge bg-success"><i className="bi bi-check2-circle me-1"></i> القيد متوازن تماماً</span>
                            ) : (
                              <span className="badge bg-danger">
                                <i className="bi bi-x-circle me-1"></i> فرق عدم توازن: {Math.abs(formTotalDebit - formTotalCredit).toFixed(2)} ج.م
                              </span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending || !isFormBalanced}
                  >
                    {createMutation.isPending ? 'جاري الترحيل...' : 'ترحيل القيد المزدوج'}
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
