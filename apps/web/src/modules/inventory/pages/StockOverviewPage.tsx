import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthContext';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function StockOverviewPage() {
  const { activeBranchId } = useAuth();
  const queryClient = useQueryClient();

  const [selectedBranchId, setSelectedBranchId] = useState(activeBranchId || '');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'AVAILABLE' | 'ALL' | 'SOLD'>('AVAILABLE');
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'parts'>('overview');

  // New stock count modal
  const [showCountModal, setShowCountModal] = useState(false);
  const [countWarehouseId, setCountWarehouseId] = useState('');
  const [countNotes, setCountNotes] = useState('');

  // Edit balance modal
  const [editingBalance, setEditingBalance] = useState<any>(null);
  const [editQty, setEditQty] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  // Fetch all branches
  const { data: branchesRaw } = useQuery({
    queryKey: ['branches-all'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches', { params: { limit: 100 } });
      return res?.data || res;
    },
  });
  const branches: any[] = Array.isArray(branchesRaw) ? branchesRaw : branchesRaw?.data || [];

  // Fetch warehouses for selected branch
  const { data: warehousesRaw } = useQuery({
    queryKey: ['warehouses-by-branch', selectedBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/warehouses', {
        params: { branchId: selectedBranchId || undefined, limit: 100 },
      });
      return res?.data || res;
    },
  });
  const warehouses: any[] = Array.isArray(warehousesRaw) ? warehousesRaw : warehousesRaw?.data || [];

  // Fetch stock balances
  const { data: balancesRaw, isLoading: loadingBalances } = useQuery({
    queryKey: ['stock-balances-overview', selectedWarehouseId, selectedBranchId, search],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/balances', {
        params: {
          warehouseId: selectedWarehouseId || undefined,
          search: search || undefined,
          limit: 200,
        },
      });
      return res?.data || res;
    },
  });

  // Fetch vehicle units
  const { data: vehiclesRaw, isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicle-units-overview', selectedBranchId, selectedWarehouseId, search, vehicleStatusFilter],
    queryFn: async () => {
      const res: any = await apiClient.get('/inventory/vehicles', {
        params: {
          branchId: selectedBranchId || undefined,
          warehouseId: selectedWarehouseId || undefined,
          search: search || undefined,
          status: vehicleStatusFilter === 'ALL' ? undefined : vehicleStatusFilter,
          limit: 200,
        },
      });
      return res?.data || res;
    },
    enabled: activeTab === 'vehicles',
  });

  const allBalances: any[] = Array.isArray(balancesRaw)
    ? balancesRaw
    : balancesRaw?.data || [];

  // Filter by branch (client-side if branchId not in API)
  const balances = selectedBranchId
    ? allBalances.filter((b: any) => b.warehouse?.branch?.id === selectedBranchId || b.warehouse?.branchId === selectedBranchId)
    : allBalances;

  const vehicles: any[] = Array.isArray(vehiclesRaw)
    ? vehiclesRaw
    : vehiclesRaw?.data || [];

  // Parts vs vehicles split
  const partsBalances = balances.filter((b: any) => b.product?.type !== 'VEHICLE');
  const vehicleBalances = balances.filter((b: any) => b.product?.type === 'VEHICLE');

  // Summary stats
  const totalItems = balances.length;
  const lowStockItems = balances.filter((b: any) => b.quantity <= (b.product?.minStockAlert || 0) && b.quantity > 0);
  const zeroStockItems = balances.filter((b: any) => b.quantity <= 0);
  const totalStockValue = balances.reduce((sum: number, b: any) => sum + (b.quantity * (b.avgCost || 0)), 0);

  // Mutations
  const editMutation = useMutation({
    mutationFn: async ({ id, qty, notes }: any) =>
      apiClient.put(`/inventory/balances/${id}`, { quantity: qty, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances-overview'] });
      toast.success('تم تحديث الرصيد بنجاح');
      setEditingBalance(null);
    },
    onError: (err: any) => toast.error(err?.message || 'فشل تحديث الرصيد'),
  });

  const countMutation = useMutation({
    mutationFn: async (data: any) => apiClient.post('/inventory/counts', data),
    onSuccess: () => {
      toast.success('تم بدء الجرد بنجاح');
      setShowCountModal(false);
      setCountNotes('');
    },
    onError: (err: any) => toast.error(err?.message || 'فشل بدء الجرد'),
  });

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      AVAILABLE: 'bg-success',
      RESERVED: 'bg-warning text-dark',
      SOLD: 'bg-secondary',
      IN_SERVICE: 'bg-info',
      DAMAGED: 'bg-danger',
      TRANSFERRED: 'bg-primary',
    };
    return map[status] || 'bg-light text-dark';
  };

  const statusAr = (status: string) => {
    const map: Record<string, string> = {
      AVAILABLE: 'متاح',
      RESERVED: 'محجوز',
      SOLD: 'مباع',
      IN_SERVICE: 'صيانة',
      DAMAGED: 'تالف',
      TRANSFERRED: 'محول',
      CONSIGNMENT: 'أمانة',
    };
    return map[status] || status;
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-boxes me-2 text-primary" />
            جرد ورصيد المخزون
          </h3>
          <p className="text-muted mb-0">عرض كل الفروع والمستودعات — رصيد حي لكل صنف ومركبة</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={() => {
              setCountWarehouseId(selectedWarehouseId || warehouses[0]?.id || '');
              setShowCountModal(true);
            }}
          >
            <i className="bi bi-clipboard-check me-1" />
            بدء جرد جديد
          </button>
        </div>
      </div>

      {/* Branch + Warehouse Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold small text-muted">الفرع</label>
              <select
                className="form-select"
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setSelectedWarehouseId('');
                }}
              >
                <option value="">كل الفروع</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr || b.nameEn} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold small text-muted">المستودع</label>
              <select
                className="form-select"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
              >
                <option value="">كل المستودعات</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.nameAr || w.nameEn} ({w.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold small text-muted">بحث</label>
              <input
                type="text"
                className="form-control"
                placeholder="اسم الصنف أو SKU أو VIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {activeTab === 'vehicles' && (
              <div className="col-md-2">
                <label className="form-label fw-semibold small text-muted">حالة السكوتر</label>
                <select
                  className="form-select"
                  value={vehicleStatusFilter}
                  onChange={(e: any) => setVehicleStatusFilter(e.target.value)}
                >
                  <option value="AVAILABLE">المتاح فقط بالمخزن</option>
                  <option value="ALL">جميع الحالات</option>
                  <option value="SOLD">المباع فقط</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="display-6 fw-bold text-primary">{totalItems}</div>
              <div className="small text-muted">إجمالي الأصناف</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="display-6 fw-bold text-warning">{lowStockItems.length}</div>
              <div className="small text-muted">أصناف منخفضة</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="display-6 fw-bold text-danger">{zeroStockItems.length}</div>
              <div className="small text-muted">أصناف منتهية</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="fw-bold text-success" style={{ fontSize: '1.1rem' }}>
                {totalStockValue.toLocaleString('ar-EG')} ج.م
              </div>
              <div className="small text-muted">قيمة المخزون</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'overview' ? 'active fw-bold' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="bi bi-list-ul me-1" />
            كل الأصناف ({balances.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'vehicles' ? 'active fw-bold' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            <i className="bi bi-bicycle me-1" />
            الدراجات والمركبات ({vehicleBalances.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'parts' ? 'active fw-bold' : ''}`}
            onClick={() => setActiveTab('parts')}
          >
            <i className="bi bi-tools me-1" />
            قطع الغيار والملحقات ({partsBalances.length})
          </button>
        </li>
      </ul>

      {/* Content */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loadingBalances ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2" />
              <div>جاري تحميل بيانات المخزون...</div>
            </div>
          ) : (activeTab === 'overview' || activeTab === 'parts') ? (
            <>
              {/* Stock Balances Table */}
              {balances.length === 0 ? (
                <div className="p-5 text-center text-muted">
                  <i className="bi bi-inbox display-4 d-block mb-3 text-secondary" />
                  <h5>لا توجد بيانات مخزون</h5>
                  <p className="small">
                    {selectedBranchId ? 'هذا الفرع لا يحتوي على بيانات مخزون بعد.' : 'لا توجد بيانات مخزون في النظام.'}
                  </p>
                  <p className="small text-muted">
                    ابدأ بإضافة منتجات ثم قم بإدخال أرصدة المخزون عبر التسوية أو استلام الطلبيات.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-dark">
                      <tr>
                        <th>الصنف / SKU</th>
                        <th>النوع</th>
                        <th>الفرع / المستودع</th>
                        <th className="text-center">الكمية</th>
                        <th className="text-center">محجوز</th>
                        <th className="text-center">متاح</th>
                        <th className="text-end">متوسط التكلفة</th>
                        <th className="text-end">قيمة المخزون</th>
                        <th>الحالة</th>
                        <th className="text-center">تعديل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeTab === 'parts' ? partsBalances : balances).map((b: any) => {
                        const isLow = b.quantity > 0 && b.quantity <= (b.product?.minStockAlert || 0);
                        const isZero = b.quantity <= 0;
                        return (
                          <tr
                            key={b.id}
                            className={isZero ? 'table-danger' : isLow ? 'table-warning' : ''}
                          >
                            <td>
                              <div className="fw-semibold">{b.product?.nameAr || b.product?.nameEn}</div>
                              <div className="font-monospace text-muted" style={{ fontSize: '0.72rem' }}>
                                {b.product?.sku}
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                                {b.product?.type === 'VEHICLE' ? 'مركبة' :
                                 b.product?.type === 'SPARE_PART' ? 'قطعة غيار' :
                                 b.product?.type === 'ACCESSORY' ? 'ملحقات' :
                                 b.product?.type === 'OIL' ? 'زيوت' :
                                 b.product?.type || '—'}
                              </span>
                            </td>
                            <td>
                              <div className="fw-semibold" style={{ fontSize: '0.8rem' }}>
                                {b.warehouse?.branch?.nameAr || b.warehouse?.branch?.nameEn}
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {b.warehouse?.nameAr || b.warehouse?.nameEn}
                              </div>
                            </td>
                            <td className="text-center fw-bold">
                              <span className={isZero ? 'text-danger' : isLow ? 'text-warning' : 'text-dark'}>
                                {b.quantity}
                              </span>
                            </td>
                            <td className="text-center text-warning">{b.reservedQty || 0}</td>
                            <td className="text-center text-success fw-bold">{b.availableQty || 0}</td>
                            <td className="text-end">{b.avgCost?.toLocaleString('ar-EG')} ج.م</td>
                            <td className="text-end fw-semibold">
                              {(b.quantity * (b.avgCost || 0)).toLocaleString('ar-EG')} ج.م
                            </td>
                            <td>
                              {isZero ? (
                                <span className="badge bg-danger">منتهي</span>
                              ) : isLow ? (
                                <span className="badge bg-warning text-dark">منخفض</span>
                              ) : (
                                <span className="badge bg-success">جيد</span>
                              )}
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setEditingBalance(b);
                                  setEditQty(b.quantity);
                                  setEditNotes('');
                                }}
                              >
                                <i className="bi bi-pencil" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            // Vehicle Units Tab
            <>
              {loadingVehicles ? (
                <div className="p-5 text-center">
                  <div className="spinner-border text-primary" />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="p-5 text-center text-muted">
                  <i className="bi bi-bicycle display-4 d-block mb-3 text-secondary" />
                  <h5>لا توجد مركبات في المخزون</h5>
                  <p className="small">أضف وحدات مركبة (VIN) من صفحة المنتجات.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-dark">
                      <tr>
                        <th>الموديل / المركبة</th>
                        <th>VIN / شاسيه</th>
                        <th>رقم الماكينة</th>
                        <th>اللون / السنة</th>
                        <th>الفرع / المستودع</th>
                        <th>الحالة</th>
                        <th className="text-end">سعر البيع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v: any) => (
                        <tr key={v.id}>
                          <td>
                            <div className="fw-semibold">{v.model?.nameAr || v.model?.nameEn || v.product?.nameAr}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {v.product?.brand?.nameEn}
                            </div>
                          </td>
                          <td className="font-monospace fw-bold" style={{ fontSize: '0.8rem' }}>{v.vin}</td>
                          <td className="font-monospace text-muted" style={{ fontSize: '0.78rem' }}>{v.engineNumber}</td>
                          <td>
                            <div>{v.color}</div>
                            <div className="text-muted">{v.modelYear}</div>
                          </td>
                          <td>
                            <div className="fw-semibold" style={{ fontSize: '0.8rem' }}>
                              {v.branch?.nameAr || v.branch?.nameEn}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {v.warehouse?.nameAr || v.warehouse?.nameEn}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${statusColor(v.status)}`}>
                              {statusAr(v.status)}
                            </span>
                          </td>
                          <td className="text-end fw-bold">
                            {v.sellingPrice?.toLocaleString('ar-EG')} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ====== Edit Balance Modal ====== */}
      {editingBalance && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2 text-primary" />
                  تعديل رصيد المخزون
                </h5>
                <button className="btn-close" onClick={() => setEditingBalance(null)} />
              </div>
              <div className="modal-body">
                <div className="alert alert-info small mb-3">
                  <strong>{editingBalance.product?.nameAr || editingBalance.product?.nameEn}</strong>
                  <br />
                  المستودع: {editingBalance.warehouse?.nameAr || editingBalance.warehouse?.nameEn}
                  <br />
                  الرصيد الحالي: <strong>{editingBalance.quantity}</strong>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">الكمية الجديدة (الفعلية)</label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    value={editQty}
                    onChange={(e) => setEditQty(Number(e.target.value))}
                    min="0"
                  />
                  {editQty !== editingBalance.quantity && (
                    <div className={`small mt-1 ${editQty > editingBalance.quantity ? 'text-success' : 'text-danger'}`}>
                      الفرق: {editQty > editingBalance.quantity ? '+' : ''}{editQty - editingBalance.quantity}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">سبب التعديل</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="مثال: جرد دوري، كسر، خطأ إدخال..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  disabled={editMutation.isPending}
                  onClick={() =>
                    editMutation.mutate({
                      id: editingBalance.id,
                      qty: editQty,
                      notes: editNotes,
                    })
                  }
                >
                  {editMutation.isPending ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : (
                    <i className="bi bi-check-lg me-1" />
                  )}
                  حفظ التعديل
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setEditingBalance(null)}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Start Stock Count Modal ====== */}
      {showCountModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-clipboard-check me-2 text-success" />
                  بدء جرد مخزون جديد
                </h5>
                <button className="btn-close" onClick={() => setShowCountModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">اختر المستودع</label>
                  <select
                    className="form-select"
                    value={countWarehouseId}
                    onChange={(e) => setCountWarehouseId(e.target.value)}
                  >
                    <option value="">-- اختر مستودع --</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.nameAr || w.nameEn} — {w.branch?.nameAr || w.branch?.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">ملاحظات</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="مثال: جرد شهري أكتوبر 2026"
                    value={countNotes}
                    onChange={(e) => setCountNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-success"
                  disabled={!countWarehouseId || countMutation.isPending}
                  onClick={() => countMutation.mutate({ warehouseId: countWarehouseId, notes: countNotes })}
                >
                  {countMutation.isPending ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : (
                    <i className="bi bi-play-fill me-1" />
                  )}
                  بدء الجرد
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setShowCountModal(false)}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
