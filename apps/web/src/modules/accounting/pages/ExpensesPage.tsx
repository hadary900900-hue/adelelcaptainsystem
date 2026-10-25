import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const { activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [branchId, setBranchId] = useState(activeBranchId || '');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState<any>({
    branchId: activeBranchId || '',
    expenseAccountId: '',
    paymentSource: 'CASH', // CASH, BANK
    cashRegisterId: '',
    bankAccountId: '',
    amount: 500,
    taxRate: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    payee: '',
    category: 'UTILITIES',
    description: '',
  });

  // Fetch Expense Accounts (type === EXPENSE)
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-expense'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/accounts', {
        params: { type: 'EXPENSE' },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Cash Registers
  const { data: cashRegisters = [] } = useQuery({
    queryKey: ['cash-registers', form.branchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/cash-registers', {
        params: { branchId: form.branchId || undefined },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Bank Accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/bank-accounts');
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

  // Fetch Expenses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses-list', branchId, category, startDate, endDate, search],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/expenses', {
        params: {
          branchId: branchId || undefined,
          category: category || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: search || undefined,
        },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  // Create Expense Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post('/accounting/expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-pnl'] });
      toast.success('تم تسجيل المصروف وترحيل القيد المحاسبي آلياً بنجاح');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'فشل تسجيل المصروف');
    },
  });

  const resetForm = () => {
    setForm({
      branchId: activeBranchId || branches[0]?.id || '',
      expenseAccountId: '',
      paymentSource: 'CASH',
      cashRegisterId: '',
      bankAccountId: '',
      amount: 500,
      taxRate: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      referenceNo: '',
      payee: '',
      category: 'UTILITIES',
      description: '',
    });
  };

  const totalExpensesAmount = expenses.reduce((sum: number, e: any) => sum + (e.grandTotal || 0), 0);

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-wallet2 text-danger me-2"></i>
            المصروفات التشغيلية والعمومية (Operating Expenses)
          </h3>
          <p className="text-muted mb-0">تسجيل وتتبع نفقات الفروع والمعارض مع الترحيل التلقائي لدفتر اليومية والأستاذ</p>
        </div>
        <button className="btn btn-danger" onClick={() => { resetForm(); setShowAddModal(true); }}>
          <i className="bi bi-plus-circle me-1"></i> تسجيل مصروف جديد
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
                placeholder="بحث برقم المصروف، البيان، أو المستفيد..."
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">جميع التصنيفات</option>
                <option value="UTILITIES">مرافق ومنافع (كهرباء، مياه، إنترنت)</option>
                <option value="RENT">إيجارات</option>
                <option value="OFFICE">أدوات مكتبية وبوفيه</option>
                <option value="MAINTENANCE">صيانة وتجهيزات</option>
                <option value="TRAVEL">انتقالات وشحن</option>
                <option value="ADVERTISING">تسويق ودعاية</option>
                <option value="OTHER">مصروفات أخرى</option>
              </select>
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="col-md-1 text-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => { setSearch(''); setBranchId(''); setCategory(''); setStartDate(''); setEndDate(''); }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="alert alert-danger bg-danger-subtle border-0 d-flex justify-content-between align-items-center mb-4">
        <div>
          <i className="bi bi-calculator me-2"></i>
          إجمالي المصروفات في الفترة المحددة:
        </div>
        <div className="fs-5 fw-bold font-monospace text-danger">
          {totalExpensesAmount.toLocaleString()} ج.م
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th className="ps-3">رقم المصروف</th>
                  <th>التاريخ</th>
                  <th>الفرع</th>
                  <th>الحساب المحاسبي</th>
                  <th>البيان / الوصف</th>
                  <th>المستفيد</th>
                  <th>طريقة الدفع</th>
                  <th className="text-end">المبلغ</th>
                  <th className="text-end">الضريبة</th>
                  <th className="text-end pe-3">الإجمالي المنصرف</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="text-center py-5">جاري التحميل...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-5 text-muted">لا توجد مصروفات مسجلة</td></tr>
                ) : (
                  expenses.map((exp: any) => (
                    <tr key={exp.id}>
                      <td className="ps-3 font-monospace fw-bold text-danger">{exp.expenseNumber}</td>
                      <td>{new Date(exp.expenseDate).toLocaleDateString('ar-EG')}</td>
                      <td>{exp.branch?.nameAr || exp.branch?.nameEn || 'الرئيسي'}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {exp.expenseAccount?.code} - {exp.expenseAccount?.nameAr}
                        </span>
                      </td>
                      <td style={{ maxWidth: '220px' }} className="text-truncate">{exp.description}</td>
                      <td>{exp.payee || '—'}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary">
                          {exp.paymentSource === 'CASH' ? 'خزينة نقدية' : 'تحويل بنكي'}
                        </span>
                      </td>
                      <td className="text-end font-monospace">{exp.amount?.toLocaleString()} ج.م</td>
                      <td className="text-end font-monospace text-muted">{exp.taxAmount?.toLocaleString()} ج.م</td>
                      <td className="text-end pe-3 font-monospace fw-bold text-danger fs-6">
                        {exp.grandTotal?.toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">تسجيل مصروف تشغيلي جديد</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">الفرع *</label>
                      <select
                        className="form-select"
                        required
                        value={form.branchId}
                        onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      >
                        <option value="">-- اختر الفرع --</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.nameAr || b.nameEn}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">بند / حساب المصروف *</label>
                      <select
                        className="form-select"
                        required
                        value={form.expenseAccountId}
                        onChange={(e) => setForm({ ...form, expenseAccountId: e.target.value })}
                      >
                        <option value="">-- اختر حساب المصروف --</option>
                        {accounts.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">المبلغ الأساسي (ج.م) *</label>
                      <input
                        type="number"
                        className="form-control font-monospace"
                        required
                        min="1"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">نسبة الضريبة (%)</label>
                      <select
                        className="form-select"
                        value={form.taxRate}
                        onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                      >
                        <option value="0">بدون ضريبة (0%)</option>
                        <option value="14">ضريبة القيمة المضافة (14%)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold">تاريخ الصرف *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={form.expenseDate}
                        onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">مصدر السداد *</label>
                      <select
                        className="form-select"
                        value={form.paymentSource}
                        onChange={(e) => setForm({ ...form, paymentSource: e.target.value })}
                      >
                        <option value="CASH">خزينة نقدية (Cash Register)</option>
                        <option value="BANK">حساب بنكي (Bank Account)</option>
                      </select>
                    </div>

                    {form.paymentSource === 'CASH' ? (
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">الخزينة المحددة</label>
                        <select
                          className="form-select"
                          value={form.cashRegisterId}
                          onChange={(e) => setForm({ ...form, cashRegisterId: e.target.value })}
                        >
                          <option value="">الخزينة الافتراضية للفرع</option>
                          {cashRegisters.map((cr: any) => (
                            <option key={cr.id} value={cr.id}>{cr.nameAr || cr.nameEn}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">الحساب البنكي</label>
                        <select
                          className="form-select"
                          value={form.bankAccountId}
                          onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                        >
                          <option value="">اختر الحساب البنكي...</option>
                          {bankAccounts.map((ba: any) => (
                            <option key={ba.id} value={ba.id}>{ba.bankName} - {ba.accountNumber}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">الجهة المستفيدة / Payee</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="مثال: شركة الكهرباء أو المالك أو اسم المورد"
                        value={form.payee}
                        onChange={(e) => setForm({ ...form, payee: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold">رقم الإيصال / الفاتورة المرجعية</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="اختياري..."
                        value={form.referenceNo}
                        onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">البيان / تفاصيل المصروف *</label>
                      <textarea
                        className="form-control"
                        required
                        rows={2}
                        placeholder="اكتب تفاصيل المصروف بدقة..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-danger" disabled={createMutation.isPending || !form.branchId || !form.expenseAccountId}>
                    {createMutation.isPending ? 'جاري التسجيل والترحيل...' : 'اعتماد وصرف المصروف'}
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
