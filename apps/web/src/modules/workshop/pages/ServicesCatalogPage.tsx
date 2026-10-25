import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function ServicesCatalogPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sku, setSku] = useState('');
  const [retailPrice, setRetailPrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>(0);
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Services (Products where type === 'SERVICE')
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services-catalog-list', search],
    queryFn: async () => {
      const res: any = await apiClient.get('/products', {
        params: { type: 'SERVICE', search: search || undefined, limit: 100 },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  const services = servicesData || [];

  const createServiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post('/products', payload);
      return res?.data?.data || res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-catalog-list'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'فشل حفظ الخدمة الجديدة');
    },
  });

  const resetForm = () => {
    setNameEn('');
    setNameAr('');
    setSku('');
    setRetailPrice('');
    setCostPrice(0);
    setDescription('');
    setErrorMsg('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return setErrorMsg('يرجى إدخال اسم الخدمة بالإنجليزية');
    if (retailPrice === '' || Number(retailPrice) < 0) return setErrorMsg('يرجى تحديد سعر الخدمة');

    const generatedSku = sku.trim() || `SRV-${Date.now().toString().slice(-6)}`;

    createServiceMutation.mutate({
      nameEn,
      nameAr: nameAr || nameEn,
      sku: generatedSku,
      type: 'SERVICE',
      retailPrice: Number(retailPrice),
      costPrice: Number(costPrice) || 0,
      description: description || null,
      isActive: true,
    });
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-card-checklist text-primary me-2"></i>
            كتالوج خدمات ومصنعيات الصيانة (Services Catalog)
          </h3>
          <p className="text-muted mb-0">
            تعريف خدمات الورشة غير المخزنية مثل تغيير الزيت، الصيانة الدورية، الفحص وضبط التاكيهات
          </p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2 fw-bold shadow-sm"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <i className="bi bi-plus-circle-fill"></i>
          <span>إضافة خدمة صيانة جديدة</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="بحث بكود الخدمة (Service Code) أو اسم الخدمة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4 d-grid">
              <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                إعادة ضبط البحث
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">كود الخدمة</th>
                  <th>اسم الخدمة (عربي)</th>
                  <th>اسم الخدمة (English)</th>
                  <th>السعر للعميل (ج.م)</th>
                  <th>تكلفة المصنعية الفنية</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      لا توجد خدمات مضافة حتى الآن. اضغط على زر "إضافة خدمة صيانة جديدة".
                    </td>
                  </tr>
                ) : (
                  services.map((s: any) => (
                    <tr key={s.id}>
                      <td className="ps-3 fw-bold font-monospace text-primary">{s.sku}</td>
                      <td className="fw-semibold">{s.nameAr || '—'}</td>
                      <td>{s.nameEn}</td>
                      <td className="fw-bold text-success">{s.retailPrice?.toLocaleString()} ج.م</td>
                      <td>{s.costPrice ? `${s.costPrice.toLocaleString()} ج.م` : '—'}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                          خدمة صيانة (غير مخزنية)
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${s.isActive ? 'bg-success' : 'bg-secondary'}`}>
                          {s.isActive ? 'نشط' : 'معطل'}
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

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">إضافة خدمة صيانة جديدة</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">اسم الخدمة (عربي) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: مصنعية تغيير زيت الموتور والفلتر"
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Service Name (English) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Engine Oil & Filter Change Labor"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">كود الخدمة (SKU)</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="تلقائي إن تُرك فارغاً"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">سعر الخدمة للعميل (ج.م) *</label>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        value={retailPrice}
                        onChange={(e) => setRetailPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">الوصف / تفاصيل الخدمة</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="وصف تفصيلي للأعمال المتضمنة في هذه الخدمة..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold"
                    disabled={createServiceMutation.isPending}
                  >
                    {createServiceMutation.isPending ? 'جاري الحفظ...' : 'حفظ الخدمة في الكتالوج'}
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
