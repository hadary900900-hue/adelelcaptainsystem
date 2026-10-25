import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';

export default function StockOrdersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [threshold, setThreshold] = useState(5);
  const [branchId, setBranchId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  const { data: branchesData } = useQuery({ queryKey: ['branches-so'], queryFn: async () => { const r: any = await apiClient.get('/branches', { params: { limit: 50 } }); return r?.data || r || []; } });
  const { data: warehousesData } = useQuery({ queryKey: ['warehouses-so', branchId], queryFn: async () => { if (!branchId) return []; const r: any = await apiClient.get('/warehouses', { params: { branchId, limit: 50 } }); return r?.data || r || []; }, enabled: !!branchId });
  const { data: ordersData, isLoading } = useQuery({ queryKey: ['stock-orders', statusFilter], queryFn: async () => { const r: any = await apiClient.get('/inventory/stock-orders', { params: { limit: 50, status: statusFilter || undefined } }); return r; } });
  const { data: lowStockData, isLoading: lowLoading } = useQuery({
    queryKey: ['low-stock-preview', warehouseId, threshold],
    queryFn: async () => { if (!warehouseId) return []; const r: any = await apiClient.get('/inventory/low-stock', { params: { warehouseId, threshold } }); return r?.data || r || []; },
    enabled: !!warehouseId && showCreate,
  });

  const createMut = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/inventory/stock-orders', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-orders'] }); alert('تم إنشاء طلب التزويد بنجاح!'); setShowCreate(false); setNotes(''); },
    onError: (e: any) => alert(e?.response?.data?.message || e?.message || 'فشل إنشاء الطلب'),
  });

  const actionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => apiClient.post(`/inventory/stock-orders/${id}/action`, { action }),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['stock-orders'] }); alert(v.action === 'CONFIRMED' ? 'تم تأكيد الطلب ✅' : 'تم رفض الطلب ❌'); },
    onError: (e: any) => alert(e?.response?.data?.message || e?.message || 'فشل'),
  });

  const orders = ordersData?.data || (Array.isArray(ordersData) ? ordersData : []);
  const branches: any[] = branchesData || [];
  const warehouses: any[] = warehousesData || [];
  const lowItems: any[] = lowStockData || [];

  const statusBadge: Record<string, string> = { PENDING: 'bg-warning text-dark', CONFIRMED: 'bg-success', REJECTED: 'bg-danger', FULFILLED: 'bg-info' };
  const statusLabel: Record<string, string> = { PENDING: 'قيد الانتظار', CONFIRMED: 'تم التأكيد', REJECTED: 'مرفوض', FULFILLED: 'تم التنفيذ' };

  const handleCreate = () => {
    if (!branchId || !warehouseId) { alert('اختر الفرع والمخزن'); return; }
    createMut.mutate({
      branchId,
      warehouseId,
      thresholdQty: threshold,
      notes,
      items: lowItems.map((b: any) => {
        const autoQty = Math.max(1, threshold - b.quantity);
        const reqQty = customQuantities[b.productId] !== undefined ? customQuantities[b.productId] : autoQty;
        return {
          productId: b.productId,
          currentQty: b.quantity,
          requestedQty: Math.max(1, reqQty),
        };
      }),
    });
  };

  return (
    <div dir="rtl" className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">طلبات التزويد (Stock Orders)</h3>
          <p className="text-muted mb-0">الفرع يطلب النواقص — أمين المخزن يؤكد أو يرفض</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <i className="bi bi-plus-circle me-1" />إنشاء طلب تزويد
        </button>
      </div>

      {/* Filter */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-auto"><label className="form-label mb-0 fw-semibold">فلتر الحالة:</label></div>
            {['', 'PENDING', 'CONFIRMED', 'REJECTED'].map(s => (
              <div className="col-auto" key={s}>
                <button className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setStatusFilter(s)}>
                  {s ? (statusLabel[s] || s) : 'الكل'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center"><div className="spinner-border text-primary" /><div className="mt-2">جاري التحميل...</div></div>
          ) : orders.length === 0 ? (
            <div className="p-5 text-center text-muted"><i className="bi bi-inbox display-4 d-block mb-2" /><h5>لا توجد طلبات تزويد</h5></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>رقم الطلب</th>
                    <th>الفرع / المخزن</th>
                    <th>عدد البنود</th>
                    <th>الحد الأدنى</th>
                    <th>الحالة</th>
                    <th>أنشأه</th>
                    <th>أكده</th>
                    <th>التاريخ</th>
                    <th className="text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr 
                      key={o.id} 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedOrder(o)}
                    >
                      <td className="fw-bold font-monospace text-primary">
                        <i className="bi bi-eye me-1 text-secondary" />
                        {o.orderNumber}
                      </td>
                      <td>
                        <div className="fw-semibold">{o.branch?.nameAr || o.branch?.nameEn}</div>
                        <div className="small text-muted">{o.warehouse?.nameAr || o.warehouse?.nameEn}</div>
                      </td>
                      <td><span className="badge bg-light text-dark border">{o.items?.length || 0} منتج</span></td>
                      <td>{o.thresholdQty}</td>
                      <td><span className={`badge ${statusBadge[o.status] || 'bg-secondary'}`}>{statusLabel[o.status] || o.status}</span></td>
                      <td className="small">{o.createdBy ? `${o.createdBy.firstNameAr || o.createdBy.firstNameEn} ${o.createdBy.lastNameAr || o.createdBy.lastNameEn}` : '—'}</td>
                      <td className="small">{o.confirmedBy ? `${o.confirmedBy.firstNameAr || o.confirmedBy.firstNameEn}` : '—'}</td>
                      <td className="small text-muted">{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        {o.status === 'PENDING' ? (
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-success" disabled={actionMut.isPending} onClick={() => { if (window.confirm('تأكيد طلب التزويد؟')) actionMut.mutate({ id: o.id, action: 'CONFIRMED' }); }}>
                              <i className="bi bi-check2-circle me-1" />تأكيد
                            </button>
                            <button className="btn btn-outline-danger" disabled={actionMut.isPending} onClick={() => { if (window.confirm('رفض طلب التزويد؟')) actionMut.mutate({ id: o.id, action: 'REJECTED' }); }}>
                              <i className="bi bi-x-circle" />
                            </button>
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* === DETAILS MODAL === */}
      {selectedOrder && (
        <div 
          className="modal show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} 
          onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null); }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-file-earmark-text me-2" />
                  تفاصيل طلب التزويد: {selectedOrder.orderNumber}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedOrder(null)} />
              </div>
              <div className="modal-body">
                {/* Meta info */}
                <div className="row g-3 p-3 bg-light rounded mb-3">
                  <div className="col-md-4">
                    <span className="text-muted d-block small">الفرع:</span>
                    <strong>{selectedOrder.branch?.nameAr || selectedOrder.branch?.nameEn}</strong>
                  </div>
                  <div className="col-md-4">
                    <span className="text-muted d-block small">المخزن:</span>
                    <strong>{selectedOrder.warehouse?.nameAr || selectedOrder.warehouse?.nameEn}</strong>
                  </div>
                  <div className="col-md-4">
                    <span className="text-muted d-block small">الحالة:</span>
                    <span className={`badge ${statusBadge[selectedOrder.status] || 'bg-secondary'}`}>
                      {statusLabel[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>
                  <div className="col-md-4">
                    <span className="text-muted d-block small">أنشأه:</span>
                    <span>{selectedOrder.createdBy ? `${selectedOrder.createdBy.firstNameAr || selectedOrder.createdBy.firstNameEn} ${selectedOrder.createdBy.lastNameAr || selectedOrder.createdBy.lastNameEn}` : '—'}</span>
                  </div>
                  <div className="col-md-4">
                    <span className="text-muted d-block small">تاريخ الطلب:</span>
                    <span>{new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}</span>
                  </div>
                  <div className="col-md-4">
                    <span className="text-muted d-block small">الحد الأدنى المستخدم:</span>
                    <span className="badge bg-secondary">أقل من {selectedOrder.thresholdQty}</span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="col-12 border-top pt-2 mt-2">
                      <span className="text-muted d-block small">ملاحظات:</span>
                      <p className="mb-0 text-dark">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <h6 className="fw-bold mb-2">
                  <i className="bi bi-box-seam me-1 text-primary" />
                  قائمة الأصناف المطلوبة ({selectedOrder.items?.length || 0})
                </h6>
                <div className="table-responsive border rounded" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>#</th>
                        <th>المنتج</th>
                        <th>كود الصنف (SKU)</th>
                        <th>النوع</th>
                        <th className="text-center">الرصيد وقت الطلب</th>
                        <th className="text-center">الكمية المطلوبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it: any, idx: number) => (
                        <tr key={it.id || idx}>
                          <td>{idx + 1}</td>
                          <td className="fw-semibold">{it.product?.nameAr || it.product?.nameEn}</td>
                          <td className="font-monospace small">{it.product?.sku}</td>
                          <td>
                            <span className={`badge ${it.product?.type === 'VEHICLE' ? 'bg-primary' : 'bg-secondary'}`}>
                              {it.product?.type}
                            </span>
                          </td>
                          <td className="text-center text-danger fw-bold">{it.currentQty}</td>
                          <td className="text-center text-success fw-bold">+{it.requestedQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-between">
                <div>
                  {selectedOrder.status === 'PENDING' && (
                    <div className="btn-group">
                      <button 
                        className="btn btn-success" 
                        disabled={actionMut.isPending} 
                        onClick={() => {
                          if (window.confirm('تأكيد طلب التزويد؟')) {
                            actionMut.mutate({ id: selectedOrder.id, action: 'CONFIRMED' });
                            setSelectedOrder(null);
                          }
                        }}
                      >
                        <i className="bi bi-check2-circle me-1" />تأكيد الطلب
                      </button>
                      <button 
                        className="btn btn-outline-danger" 
                        disabled={actionMut.isPending} 
                        onClick={() => {
                          if (window.confirm('رفض طلب التزويد؟')) {
                            actionMut.mutate({ id: selectedOrder.id, action: 'REJECTED' });
                            setSelectedOrder(null);
                          }
                        }}
                      >
                        <i className="bi bi-x-circle me-1" />رفض
                      </button>
                    </div>
                  )}
                </div>
                <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === CREATE MODAL === */}
      {showCreate && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold"><i className="bi bi-box-seam me-2" />إنشاء طلب تزويد — النواقص</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">الفرع *</label>
                    <select className="form-select" value={branchId} onChange={e => { setBranchId(e.target.value); setWarehouseId(''); }}>
                      <option value="">اختر الفرع</option>
                      {branches.map((b: any) => <option key={b.id} value={b.id}>{b.nameAr || b.nameEn}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">المخزن *</label>
                    <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                      <option value="">اختر المخزن</option>
                      {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.nameAr || w.nameEn}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-funnel me-1" />الحد الأدنى (أقل من)
                    </label>
                    <input type="number" min={1} className="form-control" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
                    <div className="form-text">المنتجات اللي كميتها أقل من الرقم ده هتظهر تلقائياً</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">ملاحظات</label>
                    <input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثال: نقص خوذات في فرع الدقي" />
                  </div>
                </div>

                <h6 className="fw-bold border-bottom pb-2 mb-3">
                  <i className="bi bi-exclamation-triangle text-warning me-1" />
                  المنتجات الناقصة (أقل من {threshold})
                  {lowItems.length > 0 && <span className="badge bg-danger ms-2">{lowItems.length}</span>}
                </h6>

                {!warehouseId ? (
                  <div className="alert alert-info py-2">اختر الفرع والمخزن لعرض النواقص</div>
                ) : lowLoading ? (
                  <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary" /> جاري التحميل...</div>
                ) : lowItems.length === 0 ? (
                  <div className="alert alert-success py-2"><i className="bi bi-check-circle me-1" />لا يوجد نقص — كل المنتجات فوق الحد الأدنى 🎉</div>
                ) : (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }} className="border rounded">
                    <table className="table table-sm table-striped mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>المنتج</th>
                          <th>SKU</th>
                          <th>النوع</th>
                          <th>الكمية الحالية</th>
                          <th style={{ width: 150 }}>المطلوب تزويده</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowItems.map((b: any) => {
                          const autoQty = Math.max(1, threshold - b.quantity);
                          const currentVal = customQuantities[b.productId] !== undefined ? customQuantities[b.productId] : autoQty;
                          return (
                            <tr key={b.id || b.productId}>
                              <td className="fw-semibold">{b.product?.nameAr || b.product?.nameEn}</td>
                              <td className="font-monospace small">{b.product?.sku}</td>
                              <td><span className={`badge ${b.product?.type === 'VEHICLE' ? 'bg-primary' : 'bg-secondary'}`}>{b.product?.type}</span></td>
                              <td><span className="text-danger fw-bold">{b.quantity}</span></td>
                              <td>
                                <input
                                  type="number"
                                  min={1}
                                  className="form-control form-control-sm text-center fw-bold text-success border-success"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setCustomQuantities(prev => ({
                                      ...prev,
                                      [b.productId]: val
                                    }));
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>إلغاء</button>
                <button className="btn btn-primary" disabled={createMut.isPending || lowItems.length === 0} onClick={handleCreate}>
                  {createMut.isPending ? <><span className="spinner-border spinner-border-sm me-1" />جاري الإرسال...</> : <><i className="bi bi-send me-1" />إرسال طلب التزويد ({lowItems.length} منتج)</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
