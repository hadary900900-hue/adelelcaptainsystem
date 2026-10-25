import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';

interface TransferItem {
  productId: string;
  vehicleUnitIds: string[]; // for VEHICLE products
  requestedQty: number;
  unitCost: number;
  notes: string;
}

const emptyItem = (): TransferItem => ({
  productId: '',
  vehicleUnitIds: [],
  requestedQty: 1,
  unitCost: 0,
  notes: '',
});

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    sourceWarehouseId: '',
    targetWarehouseId: '',
    notes: '',
  });
  const [items, setItems] = useState<TransferItem[]>([emptyItem()]);

  // ---- queries ----
  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/transfers', { params: { limit: 50 } });
      return res as any;
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-select-transfers'],
    queryFn: async () => {
      const res: any = await apiClient.get('/warehouses', { params: { limit: 100 } });
      return res?.data || res || [];
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-select-transfers'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products', { params: { limit: 300 } });
      return res?.data || res || [];
    },
  });

  // Load available vehicle units for a given product + source warehouse
  // We query per-product as user picks products
  const vehicleQueries = useQuery({
    queryKey: ['vehicles-for-transfer', form.sourceWarehouseId],
    queryFn: async () => {
      if (!form.sourceWarehouseId) return [];
      const res: any = await apiClient.get('/vehicles', {
        params: { warehouseId: form.sourceWarehouseId, status: 'AVAILABLE', limit: 500 },
      });
      return res?.data || res || [];
    },
    enabled: !!form.sourceWarehouseId,
  });
  const availableVehicleUnits: any[] = vehicleQueries.data || [];

  // ---- mutations ----
  const createMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/inventory/transfers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      alert('تم إنشاء أمر التحويل بنجاح! يمكن قبوله من الفرع المستلم.');
      setShowAddModal(false);
      setForm({ sourceWarehouseId: '', targetWarehouseId: '', notes: '' });
      setItems([emptyItem()]);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل إنشاء التحويل');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => apiClient.post(`/inventory/transfers/${id}/accept`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-available-pos'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-for-transfer'] });
      alert('تم قبول التحويل بنجاح! تم تحديث المخزون.');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل قبول التحويل');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => apiClient.post(`/inventory/transfers/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      alert('تم إلغاء التحويل.');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل إلغاء التحويل');
    },
  });

  // ---- helpers ----
  const allProducts: any[] = productsData || [];
  const warehouses: any[] = warehousesData || [];

  const getProductType = (productId: string) =>
    allProducts.find((p) => p.id === productId)?.type || '';

  const vehicleUnitsForProduct = (productId: string) =>
    availableVehicleUnits.filter((v: any) => v.productId === productId);

  const updateItem = (idx: number, patch: Partial<TransferItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      // if product changed, reset vehicle selection
      if (patch.productId !== undefined) next[idx].vehicleUnitIds = [];
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const toggleVehicle = (idx: number, vuId: string) => {
    setItems((prev) => {
      const next = [...prev];
      const ids = next[idx].vehicleUnitIds;
      if (ids.includes(vuId)) {
        next[idx] = { ...next[idx], vehicleUnitIds: ids.filter((x) => x !== vuId) };
      } else {
        next[idx] = { ...next[idx], vehicleUnitIds: [...ids, vuId], requestedQty: ids.length + 1 };
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.sourceWarehouseId === form.targetWarehouseId) {
      alert('المخزن المصدر والمستلم يجب أن يكونا مختلفَين');
      return;
    }
    if (items.some((it) => !it.productId)) {
      alert('يرجى اختيار منتج لكل بند');
      return;
    }
    createMutation.mutate({
      sourceWarehouseId: form.sourceWarehouseId,
      targetWarehouseId: form.targetWarehouseId,
      notes: form.notes,
      items: items.map((it) => ({
        productId: it.productId,
        vehicleUnitIds: it.vehicleUnitIds.length > 0 ? it.vehicleUnitIds : undefined,
        requestedQty: it.vehicleUnitIds.length > 0 ? it.vehicleUnitIds.length : it.requestedQty,
        unitCost: it.unitCost,
        notes: it.notes,
      })),
    });
  };

  const transfers = transfersData?.data || (Array.isArray(transfersData) ? transfersData : []);

  const statusBadge = (s: string) => {
    if (s === 'COMPLETED') return 'bg-success';
    if (s === 'PENDING') return 'bg-warning text-dark';
    if (s === 'CANCELLED') return 'bg-danger';
    return 'bg-secondary';
  };

  const statusLabel: Record<string, string> = {
    COMPLETED: 'مكتمل',
    PENDING: 'قيد الانتظار',
    CANCELLED: 'ملغي',
  };

  return (
    <div dir="rtl" className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">التحويلات المخزنية</h3>
          <p className="text-muted mb-0">تحويل المنتجات والاسكوترات بين المخازن والفروع مع اختيار رقم الشاسيه والموتور</p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <i className="bi bi-arrow-left-right" />
          <span>إنشاء تحويل جديد</span>
        </button>
      </div>

      {/* Transfers table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2" />
              <div>جاري التحميل...</div>
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-arrow-left-right display-4 mb-3 d-block text-secondary" />
              <h5>لا توجد تحويلات</h5>
              <p>قم بإنشاء تحويل لنقل المنتجات بين المخازن.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>رقم التحويل</th>
                    <th>من المخزن</th>
                    <th>إلى المخزن</th>
                    <th>البنود (شاسيه/كمية)</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th className="text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t: any) => (
                    <tr key={t.id}>
                      <td className="fw-bold font-monospace text-primary">{t.transferNumber}</td>
                      <td>
                        <div className="fw-semibold">{t.sourceWarehouse?.nameAr || t.sourceWarehouse?.nameEn}</div>
                        <div className="small text-muted">{t.sourceWarehouse?.branch?.nameAr}</div>
                      </td>
                      <td>
                        <div className="fw-semibold text-success">{t.targetWarehouse?.nameAr || t.targetWarehouse?.nameEn}</div>
                        <div className="small text-muted">{t.targetWarehouse?.branch?.nameAr}</div>
                      </td>
                      <td>
                        {(t.items || []).map((i: any) => (
                          <div key={i.id} className="small mb-1">
                            <span className="badge bg-light text-dark border me-1">{i.product?.nameAr || i.product?.nameEn}</span>
                            {i.vehicleUnit ? (
                              <span className="text-success fw-semibold">
                                <i className="bi bi-motorcycle me-1" />
                                شاسيه: {i.vehicleUnit.vin} | موتور: {i.vehicleUnit.engineNumber} | {i.vehicleUnit.color}
                              </span>
                            ) : (
                              <span className="text-muted">الكمية: {i.requestedQty}</span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(t.status)}`}>
                          {statusLabel[t.status] || t.status}
                        </span>
                      </td>
                      <td className="small text-muted">{new Date(t.createdAt).toLocaleDateString('ar-EG')}</td>
                      <td className="text-center">
                        {t.status === 'PENDING' ? (
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-success"
                              title="قبول التحويل (الفرع المستلم)"
                              disabled={acceptMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`هل تريد قبول التحويل ${t.transferNumber} في ${t.targetWarehouse?.nameEn}؟`)) {
                                  acceptMutation.mutate(t.id);
                                }
                              }}
                            >
                              <i className="bi bi-check2-circle me-1" />
                              قبول
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              title="إلغاء"
                              disabled={cancelMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`إلغاء التحويل ${t.transferNumber}?`)) {
                                  cancelMutation.mutate(t.id);
                                }
                              }}
                            >
                              <i className="bi bi-x-circle" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* === CREATE MODAL === */}
      {showAddModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-arrow-left-right me-2" />
                    إنشاء تحويل مخزني جديد
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowAddModal(false)}
                  />
                </div>

                <div className="modal-body">
                  {/* Warehouses */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-box-arrow-right me-1 text-danger" />
                        المخزن المصدر *
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.sourceWarehouseId}
                        onChange={(e) => {
                          setForm({ ...form, sourceWarehouseId: e.target.value });
                          // Reset vehicle selections when source changes
                          setItems((prev) => prev.map((it) => ({ ...it, vehicleUnitIds: [] })));
                        }}
                      >
                        <option value="">اختر المخزن المصدر</option>
                        {warehouses.map((w: any) => (
                          <option key={w.id} value={w.id}>
                            {w.nameAr || w.nameEn} — {w.branch?.nameAr || w.branch?.nameEn || ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-box-arrow-in-left me-1 text-success" />
                        المخزن المستلم *
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.targetWarehouseId}
                        onChange={(e) => setForm({ ...form, targetWarehouseId: e.target.value })}
                      >
                        <option value="">اختر المخزن المستلم</option>
                        {warehouses
                          .filter((w: any) => w.id !== form.sourceWarehouseId)
                          .map((w: any) => (
                            <option key={w.id} value={w.id}>
                              {w.nameAr || w.nameEn} — {w.branch?.nameAr || w.branch?.nameEn || ''}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">ملاحظات</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="مثال: تحويل بضاعة لفرع الدقي"
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <h6 className="fw-bold mb-3 border-bottom pb-2">
                    <i className="bi bi-list-ul me-1" />
                    البنود المحولة
                  </h6>

                  {items.map((item, idx) => {
                    const pType = getProductType(item.productId);
                    const isVehicle = pType === 'VEHICLE';
                    const unitOptions = vehicleUnitsForProduct(item.productId);

                    return (
                      <div key={idx} className="card border mb-3">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-semibold text-primary">البند #{idx + 1}</span>
                            {items.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeItem(idx)}
                              >
                                <i className="bi bi-trash" />
                              </button>
                            )}
                          </div>

                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label">المنتج *</label>
                              <select
                                className="form-select"
                                required
                                value={item.productId}
                                onChange={(e) => updateItem(idx, { productId: e.target.value })}
                              >
                                <option value="">اختر المنتج</option>
                                {allProducts.map((p: any) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nameAr || p.nameEn} ({p.sku})
                                    {p.type === 'VEHICLE' ? ' 🏍️' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {!isVehicle && (
                              <div className="col-md-3">
                                <label className="form-label">الكمية *</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="form-control"
                                  required={!isVehicle}
                                  value={item.requestedQty}
                                  onChange={(e) => updateItem(idx, { requestedQty: Number(e.target.value) })}
                                />
                              </div>
                            )}

                            <div className={isVehicle ? 'col-md-3' : 'col-md-3'}>
                              <label className="form-label">تكلفة الوحدة</label>
                              <input
                                type="number"
                                min={0}
                                className="form-control"
                                value={item.unitCost}
                                onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })}
                              />
                            </div>
                          </div>

                          {/* Vehicle picker */}
                          {isVehicle && item.productId && (
                            <div className="mt-3">
                              {!form.sourceWarehouseId ? (
                                <div className="alert alert-warning py-2 mb-0">
                                  <i className="bi bi-exclamation-triangle me-1" />
                                  يرجى اختيار المخزن المصدر أولاً لعرض الاسكوترات المتاحة
                                </div>
                              ) : vehicleQueries.isLoading ? (
                                <div className="text-muted small">
                                  <span className="spinner-border spinner-border-sm me-1" />
                                  جاري تحميل الوحدات...
                                </div>
                              ) : unitOptions.length === 0 ? (
                                <div className="alert alert-info py-2 mb-0">
                                  <i className="bi bi-info-circle me-1" />
                                  لا توجد وحدات متاحة من هذا المنتج في المخزن المختار
                                </div>
                              ) : (
                                <div>
                                  <label className="form-label fw-semibold">
                                    <i className="bi bi-motorcycle me-1 text-primary" />
                                    اختر الاسكوترات بالشاسيه والموتور
                                    {item.vehicleUnitIds.length > 0 && (
                                      <span className="badge bg-primary ms-2">{item.vehicleUnitIds.length} محدد</span>
                                    )}
                                  </label>
                                  <div style={{ maxHeight: 220, overflowY: 'auto' }} className="border rounded p-2">
                                    <table className="table table-sm table-hover mb-0">
                                      <thead className="table-light sticky-top">
                                        <tr>
                                          <th style={{ width: 36 }}>
                                            <input
                                              type="checkbox"
                                              className="form-check-input"
                                              checked={item.vehicleUnitIds.length === unitOptions.length}
                                              onChange={(e) => {
                                                updateItem(idx, {
                                                  vehicleUnitIds: e.target.checked ? unitOptions.map((u: any) => u.id) : [],
                                                  requestedQty: e.target.checked ? unitOptions.length : 0,
                                                });
                                              }}
                                              title="تحديد الكل"
                                            />
                                          </th>
                                          <th>رقم الشاسيه (VIN)</th>
                                          <th>رقم الموتور</th>
                                          <th>اللون</th>
                                          <th>سنة الصنع</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {unitOptions.map((vu: any) => {
                                          const selected = item.vehicleUnitIds.includes(vu.id);
                                          return (
                                            <tr
                                              key={vu.id}
                                              className={selected ? 'table-primary' : ''}
                                              style={{ cursor: 'pointer' }}
                                              onClick={() => toggleVehicle(idx, vu.id)}
                                            >
                                              <td>
                                                <input
                                                  type="checkbox"
                                                  className="form-check-input"
                                                  checked={selected}
                                                  readOnly
                                                />
                                              </td>
                                              <td className="fw-bold font-monospace">{vu.vin}</td>
                                              <td className="font-monospace">{vu.engineNumber}</td>
                                              <td>{vu.color}</td>
                                              <td>{vu.modelYear}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                  {item.vehicleUnitIds.length === 0 && (
                                    <div className="small text-danger mt-1">
                                      <i className="bi bi-exclamation-circle me-1" />
                                      يرجى اختيار اسكوتر واحد على الأقل
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={addItem}>
                    <i className="bi bi-plus-circle me-1" />
                    إضافة بند آخر
                  </button>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <><span className="spinner-border spinner-border-sm me-1" />جاري الإرسال...</>
                    ) : (
                      <><i className="bi bi-arrow-left-right me-1" />إنشاء التحويل</>
                    )}
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
