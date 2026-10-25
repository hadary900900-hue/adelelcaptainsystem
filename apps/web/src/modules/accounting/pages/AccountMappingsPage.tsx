import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function AccountMappingsPage() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Fetch Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-select'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/accounts');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Mappings
  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['account-mappings'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/mappings');
      return res?.data?.data || res?.data || [];
    },
  });

  // Update Mapping Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ mappingKey, accountId }: { mappingKey: string; accountId: string }) => {
      return await apiClient.put('/accounting/mappings', { mappingKey, accountId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-mappings'] });
      toast.success('تم تحديث ربط الحساب بنجاح');
      setEditingKey(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'فشل تحديث الربط');
    },
  });

  const getAccountInfo = (accountId: string) => {
    return accounts.find((a: any) => a.id === accountId);
  };

  const getMappingLabel = (key: string) => {
    const labels: Record<string, { ar: string; desc: string }> = {
      DEFAULT_CASH: { ar: 'حساب النقدية الافتراضي (الخزينة)', desc: 'يستخدم عند سداد/قبض مبيعات أو مشتريات نقدية' },
      DEFAULT_BANK: { ar: 'حساب البنك الافتراضي', desc: 'يستخدم عند الدفع بالبطاقات أو التحويل البنكي' },
      AR_CONTROL: { ar: 'حساب مراقبة العملاء (Accounts Receivable)', desc: 'تسجيل مديونيات فواتير المبيعات الآجلة' },
      AP_CONTROL: { ar: 'حساب مراقبة الموردين (Accounts Payable)', desc: 'تسجيل التزامات فواتير الشراء الآجلة' },
      INVENTORY_VEHICLES: { ar: 'مخزون الدراجات والمركبات (Asset)', desc: 'أصل مخزون المركبات المستلمة والمباعة' },
      INVENTORY_PARTS: { ar: 'مخزون قطع الغيار والإكسسوارات (Asset)', desc: 'أصل مخزون قطع الغيار والمستهلكات' },
      VAT_OUTPUT: { ar: 'ضريبة القيمة المضافة على المبيعات (مخرجات)', desc: 'التزام ضريبة 14% على الفواتير الصادرة' },
      VAT_INPUT: { ar: 'ضريبة القيمة المضافة على المشتريات (مدخلات)', desc: 'أصل ضريبة 14% المستردة على المشتريات' },
      SALES_REVENUE_VEHICLES: { ar: 'إيراد مبيعات الدراجات والمركبات', desc: 'حساب إيرادات مبيعات وحدات المركبات' },
      SALES_REVENUE_PARTS: { ar: 'إيراد مبيعات قطع الغيار والإكسسوارات', desc: 'حساب إيرادات مبيعات القطع من الكاشير' },
      SERVICE_REVENUE: { ar: 'إيرادات أجور الصيانة والمصنعيات', desc: 'إيرادات خدمات وأوامر شغل الورشة' },
      SALES_DISCOUNT: { ar: 'الخصم المسموح به (خصومات المبيعات)', desc: 'تخفيض الإيراد بالخصومات الممنوحة للعملاء' },
      COGS_VEHICLES: { ar: 'تكلفة مبيعات المركبات (COGS)', desc: 'تكلفة الأصل المباع للدراجات عند خروجها' },
      COGS_PARTS: { ar: 'تكلفة مبيعات قطع الغيار (COGS)', desc: 'تكلفة قطع الغيار المباعة للعملاء' },
      COGS_WORKSHOP_PARTS: { ar: 'تكلفة قطع الغيار المستخدمة في الصيانة', desc: 'تكلفة القطع المستهلكة في أوامر الصيانة' },
      PURCHASE_DISCOUNT: { ar: 'الخصم المكتسب على المشتريات', desc: 'الخصومات الممنوحة من الموردين' },
      CUSTOMER_DEPOSITS: { ar: 'عربونات ودفعات مقدمة من العملاء', desc: 'دفعات حجز المركبات تحت التسليم' },
      EMPLOYEE_ADVANCES: { ar: 'سلف وعهد الموظفين', desc: 'أصل سلف العاملين المستردة من الرواتب' },
      PAYROLL_EXPENSE: { ar: 'مصروف الرواتب والأجور', desc: 'المصروف الإجمالي لمسير الرواتب الشهري' },
      PAYROLL_PAYABLE: { ar: 'الرواتب والأجور المستحقة', desc: 'التزام الرواتب قبل التحويل الفعلي للموظفين' },
      DEFAULT_EXPENSE: { ar: 'المصروفات العامة الافتراضية', desc: 'الحساب الافتراضي للمصروفات النثرية' },
    };

    return labels[key] || { ar: key, desc: 'ربط محاسبي مخصص للنظام' };
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-gear-wide-connected text-primary me-2"></i>
            إعدادات التوجيه والربط المحاسبي (Account Mappings)
          </h3>
          <p className="text-muted mb-0">تحديد الحسابات المالية المقابلة للحركات الآلية (مبيعات، مشتريات، صيانة، مخزون، رواتب)</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="alert alert-info border-0 mb-0">
            <i className="bi bi-info-circle-fill me-2"></i>
            <strong>محرك التوجيه الآلي (Zero Hardcoded IDs):</strong> لا يقوم النظام بتثبيت أي حسابات داخل الكود، بل يعتمد على هذا الجدول لتوجيه كل فاتورة أو حركة مخزنية إلى الحساب المناسب الذي تختاره من شجرة الحسابات.
          </div>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3" style={{ width: '25%' }}>بند التوجيه المحاسبي</th>
                  <th style={{ width: '30%' }}>الوظيفة / الاستخدام في النظام</th>
                  <th style={{ width: '30%' }}>الحساب المربوط حالياً</th>
                  <th className="text-end pe-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-5">جاري التحميل...</td></tr>
                ) : mappings.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-5 text-muted">لا توجد إعدادات ربط مسجلة</td></tr>
                ) : (
                  mappings.map((m: any) => {
                    const info = getMappingLabel(m.mappingKey);
                    const acc = getAccountInfo(m.accountId);
                    const isEditing = editingKey === m.mappingKey;

                    return (
                      <tr key={m.id}>
                        <td className="ps-3">
                          <strong className="d-block">{info.ar}</strong>
                          <span className="badge bg-light text-secondary font-monospace border small">
                            {m.mappingKey}
                          </span>
                        </td>
                        <td className="small text-muted">{info.desc}</td>
                        <td>
                          {isEditing ? (
                            <select
                              className="form-select form-select-sm"
                              value={selectedAccountId}
                              onChange={(e) => setSelectedAccountId(e.target.value)}
                            >
                              {accounts.map((a: any) => (
                                <option key={a.id} value={a.id}>
                                  {a.code} - {a.nameAr} ({a.type})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              {acc ? (
                                <span className="badge bg-primary-subtle text-primary border border-primary fs-6 font-monospace">
                                  {acc.code} - {acc.nameAr}
                                </span>
                              ) : (
                                <span className="badge bg-danger text-white">غير محدد</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="text-end pe-3">
                          {isEditing ? (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-success"
                                onClick={() => updateMutation.mutate({ mappingKey: m.mappingKey, accountId: selectedAccountId })}
                                disabled={updateMutation.isPending}
                              >
                                <i className="bi bi-check-lg me-1"></i> حفظ
                              </button>
                              <button
                                className="btn btn-outline-secondary"
                                onClick={() => setEditingKey(null)}
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setEditingKey(m.mappingKey);
                                setSelectedAccountId(m.accountId);
                              }}
                            >
                              <i className="bi bi-pencil me-1"></i> تغيير الحساب
                            </button>
                          )}
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
    </div>
  );
}
