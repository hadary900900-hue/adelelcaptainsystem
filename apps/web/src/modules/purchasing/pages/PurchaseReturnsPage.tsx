import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function PurchaseReturnsPage() {
  const { activeBranchId } = useAuth();
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    supplierId: '',
    branchId: '',
    warehouseId: '',
    reason: '',
    notes: '',
  });

  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list-ret'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/suppliers?limit=100');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list-ret'],
    queryFn: async () => {
      const res: any = await apiClient.get('/warehouses');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list-ret'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=200');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: returnsData, isLoading, refetch } = useQuery({
    queryKey: ['purchase-returns-list', search, supplierId, activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/returns', {
        params: {
          search: search || undefined,
          supplierId: supplierId || undefined,
          branchId: activeBranchId || undefined,
          limit: 100,
        },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  const createReturnMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/purchasing/returns', payload);
    },
    onSuccess: () => {
      alert('تم تسجيل مرتجع المشتريات وتخفيض المخزون ورصيد المورد بنجاح');
      setShowAddModal(false);
      setReturnItems([]);
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل حفظ مرتجع المشتريات');
    },
  });

  const handleOpenAdd = () => {
    const defaultWh = warehousesData?.[0]?.id || '';
    const defaultBr = activeBranchId || warehousesData?.[0]?.branchId || '';
    setForm({
      supplierId: suppliersData?.[0]?.id || '',
      warehouseId: defaultWh,
      branchId: defaultBr,
      reason: 'تالف أو معيب عند الاستلام',
      notes: '',
    });
    setReturnItems([]);
    setShowAddModal(true);
  };

  const handleAddProduct = (prod: any) => {
    if (!prod) return;
    setReturnItems([
      ...returnItems,
      {
        productId: prod.id,
        productName: prod.nameAr || prod.nameEn,
        sku: prod.sku,
        quantity: 1,
        unitCost: prod.costPrice || 0,
        reason: 'عيب صناعة',
      },
    ]);
    setProductSearch('');
  };

  const returns = returnsData || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">مرتجع المشتريات للموردين (Purchase Returns)</h3>
          <p className="text-muted mb-0">إرجاع بضاعة معيبة أو فائضة للمورد وتخفيض المخزون وحساب المورد آلياً</p>
        </div>
        <button className="btn btn-danger" onClick={handleOpenAdd}>
          <i className="bi bi-arrow-return-left me-1"></i> تسجيل مرتجع مشتريات
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="ابحث برقم المرتجع أو المورد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select className="form-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">جميع الموردين</option>
                {(suppliersData || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nameAr || s.nameEn}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 text-end">
              <span className="text-muted small">إجمالي المرتجعات: <strong>{returns.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th>رقم المرتجع</th>
                  <th>المورد</th>
                  <th>المستودع</th>
                  <th>التاريخ</th>
                  <th>إجمالي قيمة المرتجع</th>
                  <th>سبب الإرجاع</th>
                  <th>مسؤول التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-4 text-center">جاري التحميل...</td></tr>
                ) : returns.length === 0 ? (
                  <tr><td colSpan={7} className="py-5 text-muted text-center">لا توجد مرتجعات مشتريات مسجلة.</td></tr>
                ) : (
                  returns.map((ret: any) => (
                    <tr key={ret.id}>
                      <td className="fw-bold font-monospace text-danger">{ret.returnNo}</td>
                      <td className="fw-semibold">{ret.supplier?.nameAr || ret.supplier?.nameEn}</td>
                      <td>{ret.warehouse?.nameAr || ret.warehouse?.nameEn}</td>
                      <td>{new Date(ret.returnDate).toLocaleDateString('ar-EG')}</td>
                      <td className="font-monospace fw-bold text-danger">{ret.grandTotal.toFixed(2)} ج.م</td>
                      <td>{ret.reason || '—'}</td>
                      <td>{ret.createdBy?.firstNameAr || ret.createdBy?.firstNameEn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered my-4">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold"><i className="bi bi-arrow-return-left me-2"></i>تسجيل مرتجع مشتريات</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (returnItems.length === 0) {
                    alert('يجب إضافة صنف واحد على الأقل للمرتجع');
                    return;
                  }
                  createReturnMutation.mutate({ ...form, items: returnItems });
                }}
              >
                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">المورد *</label>
                      <select
                        className="form-select form-select-sm"
                        required
                        value={form.supplierId}
                        onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                      >
                        <option value="">-- اختر المورد --</option>
                        {(suppliersData || []).map((s: any) => (
                          <option key={s.id} value={s.id}>{s.nameAr || s.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">المستودع المرتجع منه *</label>
                      <select
                        className="form-select form-select-sm"
                        required
                        value={form.warehouseId}
                        onChange={(e) => {
                          const wh = (warehousesData || []).find((w: any) => w.id === e.target.value);
                          setForm({
                            ...form,
                            warehouseId: e.target.value,
                            branchId: wh?.branchId || form.branchId,
                          });
                        }}
                      >
                        <option value="">-- اختر المستودع --</option>
                        {(warehousesData || []).map((w: any) => (
                          <option key={w.id} value={w.id}>{w.nameAr || w.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">سبب المرتجع العام</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="card border mb-3">
                    <div className="card-header bg-light py-2">
                      <h6 className="mb-0 fw-bold">إضافة أصناف للمرتجع</h6>
                    </div>
                    <div className="card-body">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ابحث باسم المنتج لإضافته..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                      {productSearch.trim().length > 0 && (
                        <div className="position-absolute bg-white border rounded shadow w-100 z-3 overflow-auto mt-1" style={{ maxHeight: '180px' }}>
                          {(productsData || [])
                            .filter((p: any) => p.nameAr?.toLowerCase().includes(productSearch.toLowerCase()) || p.nameEn?.toLowerCase().includes(productSearch.toLowerCase()))
                            .map((p: any) => (
                              <div
                                key={p.id}
                                className="p-2 border-bottom hover-bg-light cursor-pointer d-flex justify-content-between align-items-center"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleAddProduct(p)}
                              >
                                <div><strong>{p.nameAr || p.nameEn}</strong> ({p.sku})</div>
                                <span className="badge bg-danger">إرجاع</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered align-middle text-center mb-0" style={{ fontSize: '0.82rem' }}>
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th className="text-start">الصنف</th>
                          <th style={{ width: '90px' }}>الكمية</th>
                          <th style={{ width: '120px' }}>تكلفة الوحدة</th>
                          <th style={{ width: '130px' }}>الإجمالي</th>
                          <th style={{ width: '50px' }}>حذف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className="text-start">{item.productName}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm text-center"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const list = [...returnItems];
                                  list[idx].quantity = Number(e.target.value);
                                  setReturnItems(list);
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm text-center font-monospace"
                                min={0}
                                step="any"
                                value={item.unitCost}
                                onChange={(e) => {
                                  const list = [...returnItems];
                                  list[idx].unitCost = Number(e.target.value);
                                  setReturnItems(list);
                                }}
                              />
                            </td>
                            <td className="fw-bold font-monospace text-danger">
                              {(item.quantity * item.unitCost).toFixed(2)} ج.م
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  const list = [...returnItems];
                                  list.splice(idx, 1);
                                  setReturnItems(list);
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-danger fw-bold" disabled={createReturnMutation.isPending || returnItems.length === 0}>
                    {createReturnMutation.isPending ? 'جاري الحفظ...' : 'تأكيد المرتجع وإخراج البضاعة'}
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
