import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'ALL' | 'PART' | 'SERVICE'>('ALL');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [itemDiscount, setItemDiscount] = useState<number>(0);
  const [itemTaxRate, setItemTaxRate] = useState<number>(14);
  const [itemTechnicianId, setItemTechnicianId] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Complete Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CREDIT'>('CASH');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [completionNotes, setCompletionNotes] = useState('');

  // Deliver Modal State
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientNationalId, setRecipientNationalId] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Fetch Work Order
  const { data: wo, isLoading, refetch } = useQuery({
    queryKey: ['work-order-detail', id],
    queryFn: async () => {
      const res: any = await apiClient.get(`/workshop/${id}`);
      return res?.data?.data || res?.data;
    },
  });

  // Fetch Products & Services Catalog
  const { data: productsData } = useQuery({
    queryKey: ['catalog-products-for-workshop'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=100');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Technicians
  const { data: usersData } = useQuery({
    queryKey: ['technicians-list-order-detail'],
    queryFn: async () => {
      const res: any = await apiClient.get('/users?limit=100');
      return res?.data?.data || res?.data || [];
    },
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res: any = await apiClient.put(`/workshop/${id}`, { status });
      return res?.data?.data || res?.data;
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'تم تحديث حالة أمر الشغل بنجاح' });
      refetch();
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'danger', text: err.response?.data?.message || 'فشل تحديث الحالة' });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post(`/workshop/${id}/items`, payload);
      return res?.data?.data || res?.data;
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'تمت إضافة البند وحجز المخزون إن وجد بنجاح' });
      setShowAddModal(false);
      resetItemForm();
      refetch();
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'danger', text: err.response?.data?.message || 'فشل إضافة البند' });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res: any = await apiClient.delete(`/workshop/${id}/items/${itemId}`);
      return res?.data;
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'تم حذف البند وإلغاء حجز المخزون بنجاح' });
      refetch();
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'danger', text: err.response?.data?.message || 'فشل حذف البند' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post(`/workshop/${id}/complete`, payload);
      return res?.data?.data || res?.data;
    },
    onSuccess: (invoice: any) => {
      setFeedbackMsg({ type: 'success', text: 'تم إنهاء الصيانة وإصدار الفاتورة الضريبية واستهلاك المخزون بنجاح' });
      setShowCompleteModal(false);
      refetch();
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'danger', text: err.response?.data?.message || 'فشل إكمال أمر الشغل' });
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post(`/workshop/${id}/deliver`, payload);
      return res?.data?.data || res?.data;
    },
    onSuccess: () => {
      setFeedbackMsg({ type: 'success', text: 'تم تسليم المركبة للعميل وتحديث حالتها بنجاح' });
      setShowDeliverModal(false);
      refetch();
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'danger', text: err.response?.data?.message || 'فشل تسليم المركبة' });
    },
  });

  const resetItemForm = () => {
    setSelectedProductId('');
    setProductSearch('');
    setProductTypeFilter('ALL');
    setItemQuantity(1);
    setItemPrice('');
    setItemDiscount(0);
    setItemTaxRate(14);
    setItemTechnicianId('');
    setItemNotes('');
  };

  if (isLoading || !wo) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Calculate Subtotals
  const lines = wo.items || [];
  const partsTotal = lines
    .filter((l: any) => l.product?.type !== 'SERVICE')
    .reduce((sum: number, l: any) => sum + l.totalPrice, 0);
  const laborTotal = lines
    .filter((l: any) => l.product?.type === 'SERVICE')
    .reduce((sum: number, l: any) => sum + l.totalPrice, 0);
  const grandTotal = lines.reduce((sum: number, l: any) => sum + l.totalPrice, 0);

  const canEdit = !['COMPLETED', 'INVOICED', 'DELIVERED', 'CANCELLED'].includes(wo.status);

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/workshop/work-orders" className="btn btn-sm btn-outline-secondary">
              <i className="bi bi-arrow-right"></i>
            </Link>
            <h3 className="fw-bold mb-0">
              أمر شغل: <span className="text-primary">{wo.orderNumber}</span>
            </h3>
            <span className="badge bg-secondary fs-6">{wo.status}</span>
          </div>
          <p className="text-muted mb-0">
            تاريخ الاستقبال: {new Date(wo.receptionDate || wo.createdAt).toLocaleString('ar-EG')} | الفرع: {wo.branch?.nameAr || wo.branch?.nameEn}
          </p>
        </div>

        {/* Action Buttons based on status */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              <button
                className="btn btn-outline-primary d-flex align-items-center gap-1"
                onClick={() => setShowAddModal(true)}
              >
                <i className="bi bi-plus-circle"></i>
                <span>إضافة قطعة غيار / مصنعية</span>
              </button>

              {wo.status === 'RECEIVED' && (
                <button
                  className="btn btn-outline-info"
                  onClick={() => updateStatusMutation.mutate('DIAGNOSING')}
                >
                  بدء الفحص (Start Diagnosis)
                </button>
              )}
              {wo.status === 'DIAGNOSING' && (
                <button
                  className="btn btn-outline-warning"
                  onClick={() => updateStatusMutation.mutate('AWAITING_APPROVAL')}
                >
                  إرسال لموافقة العميل
                </button>
              )}
              {wo.status === 'AWAITING_APPROVAL' && (
                <button
                  className="btn btn-outline-success"
                  onClick={() => updateStatusMutation.mutate('APPROVED')}
                >
                  اعتماد العميل (Approve)
                </button>
              )}
              {['APPROVED', 'DIAGNOSING', 'WAITING_FOR_PARTS'].includes(wo.status) && (
                <button
                  className="btn btn-outline-primary"
                  onClick={() => updateStatusMutation.mutate('IN_PROGRESS')}
                >
                  بدء الصيانة (In Progress)
                </button>
              )}

              {/* Complete & Invoice Action */}
              <button
                className="btn btn-success fw-bold d-flex align-items-center gap-2 shadow-sm"
                onClick={() => {
                  setPaidAmount(grandTotal);
                  setShowCompleteModal(true);
                }}
                disabled={lines.length === 0}
              >
                <i className="bi bi-check-all fs-5"></i>
                <span>إكمال الصيانة وتوليد الفاتورة</span>
              </button>
            </>
          )}

          {wo.status === 'INVOICED' && (
            <button
              className="btn btn-primary fw-bold d-flex align-items-center gap-2 shadow-sm"
              onClick={() => {
                setRecipientName(wo.customer?.nameAr || wo.customer?.nameEn || '');
                setShowDeliverModal(true);
              }}
            >
              <i className="bi bi-box-arrow-right fs-5"></i>
              <span>تسليم المركبة للعميل (Delivery)</span>
            </button>
          )}

          {wo.invoice && (
            <Link
              to="/sales/invoices"
              className="btn btn-outline-purple border text-dark fw-bold"
              style={{ background: '#f3e8ff' }}
            >
              <i className="bi bi-receipt me-1"></i>
              الفاتورة: {wo.invoice.invoiceNo}
            </Link>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className={`alert alert-${feedbackMsg.type} shadow-sm alert-dismissible fade show mb-4`} role="alert">
          {feedbackMsg.text}
          <button type="button" className="btn-close" onClick={() => setFeedbackMsg(null)}></button>
        </div>
      )}

      {/* Reception Cards Overview */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold text-muted mb-2">
                <i className="bi bi-person me-1 text-primary"></i>
                العميل
              </h6>
              <h5 className="fw-bold text-main mb-1">{wo.customer?.nameAr || wo.customer?.nameEn}</h5>
              <div className="text-muted small">هاتف: {wo.customer?.phone}</div>
              <div className="text-muted small">الرقم القومي: {wo.customer?.nationalId || '—'}</div>
              <Link to={`/workshop/history/customer/${wo.customerId}`} className="btn btn-sm btn-link p-0 mt-2">
                عرض سجل صيانة العميل
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold text-muted mb-2">
                <i className="bi bi-bicycle me-1 text-danger"></i>
                بيانات الدراجة / المركبة
              </h6>
              <h5 className="fw-bold text-main mb-1">
                {wo.vehicleUnit?.product?.nameAr || wo.vehicleUnit?.product?.nameEn}
              </h5>
              <div className="text-muted small font-monospace">VIN: {wo.vehicleUnit?.vin}</div>
              <div className="text-muted small">موتور: {wo.vehicleUnit?.engineNumber} | لوحة: {wo.licensePlate || '—'}</div>
              <div className="d-flex align-items-center gap-2 mt-2">
                <span className="badge bg-info text-dark">عداد: {wo.odometerReading?.toLocaleString()} كم</span>
                <span className="badge bg-light text-dark border">وقود: {wo.fuelLevel || '—'}</span>
              </div>
              <Link to={`/workshop/history/vehicle/${wo.vehicleUnitId}`} className="btn btn-sm btn-link p-0 mt-2 d-block">
                عرض السجل الكامل للمركبة
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold text-muted mb-2">
                <i className="bi bi-chat-left-dots me-1 text-info"></i>
                شكوى العميل وملاحظات الفحص
              </h6>
              <div className="small fw-semibold text-danger mb-2">
                {wo.complaint || 'لا توجد شكوى مسجلة'}
              </div>
              <div className="small text-muted mb-1">
                <strong>الفحص الظاهري:</strong> {wo.conditionNotes || 'سليم / بدون ملاحظات'}
              </div>
              <div className="small text-muted">
                <strong>المتعلقات:</strong> {wo.accessories || 'لا يوجد'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Lines Table */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-transparent py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">
            <i className="bi bi-list-check text-primary me-2"></i>
            بنود أمر الشغل (قطع الغيار والخدمات)
          </h5>
          <div className="d-flex gap-3 small fw-bold">
            <span>قطع الغيار: <strong className="text-danger">{partsTotal.toLocaleString()} ج.م</strong></span>
            <span>المصنعيات: <strong className="text-primary">{laborTotal.toLocaleString()} ج.م</strong></span>
            <span>الإجمالي: <strong className="text-success">{grandTotal.toLocaleString()} ج.م</strong></span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">النوع</th>
                  <th>البند / الخدمة</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الخصم</th>
                  <th>الضريبة %</th>
                  <th>الإجمالي</th>
                  <th>الفني المنفذ</th>
                  {canEdit && <th className="text-end pe-3">إجراء</th>}
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="text-center py-4 text-muted">
                      لم يتم إضافة أي قطع غيار أو خدمات صيانة بعد. اضغط على زر "إضافة قطعة غيار / مصنعية".
                    </td>
                  </tr>
                ) : (
                  lines.map((item: any) => {
                    const isService = item.product?.type === 'SERVICE';
                    return (
                      <tr key={item.id}>
                        <td className="ps-3">
                          {isService ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                              مصنعية / خدمة
                            </span>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                              قطعة غيار (مخزون)
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="fw-bold">{item.product?.nameAr || item.product?.nameEn}</div>
                          <small className="text-muted font-monospace">{item.product?.sku}</small>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{item.unitPrice?.toLocaleString()} ج.م</td>
                        <td>{item.discount > 0 ? `${item.discount} ج.م` : '—'}</td>
                        <td>{item.taxRate}%</td>
                        <td className="fw-bold text-success">{item.totalPrice?.toLocaleString()} ج.م</td>
                        <td>
                          {item.technician ? (
                            <span className="small">{item.technician.firstNameEn}</span>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="text-end pe-3">
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="حذف البند وإلغاء حجز المخزون"
                              onClick={() => removeItemMutation.mutate(item.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">إضافة بند إلى أمر الشغل</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">
                {/* Search Bar & Type Filter for Products / Services */}
                <div className="mb-3 position-relative">
                  <label className="form-label fw-semibold">اختر المنتج أو الخدمة *</label>

                  {/* Filter tabs */}
                  <div className="btn-group btn-group-sm w-100 mb-2">
                    <button
                      type="button"
                      className={`btn ${productTypeFilter === 'ALL' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setProductTypeFilter('ALL')}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      className={`btn ${productTypeFilter === 'PART' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setProductTypeFilter('PART')}
                    >
                      <i className="bi bi-gear-fill me-1"></i> قطع غيار وزيوت
                    </button>
                    <button
                      type="button"
                      className={`btn ${productTypeFilter === 'SERVICE' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setProductTypeFilter('SERVICE')}
                    >
                      <i className="bi bi-tools me-1"></i> خدمات ومصنعيات
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="input-group mb-2">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="ابحث باسم القطعة، الخدمة، الكود أو SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    {productSearch && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setProductSearch('')}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>

                  {/* Instant suggestions list when typing */}
                  {productSearch.trim().length > 0 && (
                    <div
                      className="border rounded shadow-sm bg-white mb-2 overflow-auto"
                      style={{ maxHeight: '180px' }}
                    >
                      {(productsData || [])
                        .filter((p: any) => {
                          if (productTypeFilter === 'PART' && p.type === 'SERVICE') return false;
                          if (productTypeFilter === 'SERVICE' && p.type !== 'SERVICE') return false;
                          const s = productSearch.toLowerCase();
                          return (
                            p.nameAr?.toLowerCase().includes(s) ||
                            p.nameEn?.toLowerCase().includes(s) ||
                            p.sku?.toLowerCase().includes(s) ||
                            p.barcode?.toLowerCase().includes(s)
                          );
                        })
                        .map((p: any) => (
                          <div
                            key={p.id}
                            className="p-2 border-bottom d-flex justify-content-between align-items-center hover-bg-light"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setItemPrice(p.retailPrice || 0);
                              setProductSearch('');
                            }}
                          >
                            <div>
                              <span className={`badge me-2 ${p.type === 'SERVICE' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                                {p.type === 'SERVICE' ? 'خدمة' : 'قطعة'}
                              </span>
                              <span className="fw-bold">{p.nameAr || p.nameEn}</span>
                              <span className="text-muted small ms-2">({p.sku})</span>
                            </div>
                            <span className="text-primary fw-bold">{p.retailPrice || 0} ج.م</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Fallback Select dropdown */}
                  <select
                    className="form-select"
                    value={selectedProductId}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      setSelectedProductId(prodId);
                      const p = (productsData || []).find((x: any) => x.id === prodId);
                      if (p) {
                        setItemPrice(p.retailPrice || 0);
                      }
                    }}
                  >
                    <option value="">-- أو اختر من القائمة المنسدلة --</option>
                    {(productsData || [])
                      .filter((p: any) => {
                        if (productTypeFilter === 'PART' && p.type === 'SERVICE') return false;
                        if (productTypeFilter === 'SERVICE' && p.type !== 'SERVICE') return false;
                        if (productSearch) {
                          const s = productSearch.toLowerCase();
                          return (
                            p.nameAr?.toLowerCase().includes(s) ||
                            p.nameEn?.toLowerCase().includes(s) ||
                            p.sku?.toLowerCase().includes(s)
                          );
                        }
                        return true;
                      })
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>
                          [{p.type === 'SERVICE' ? 'خدمة' : 'قطعة'}] {p.nameAr || p.nameEn} ({p.sku}) - {p.retailPrice} ج.م
                        </option>
                      ))}
                  </select>

                  {selectedProductId && (
                    <div className="alert alert-success py-1 px-2 mt-2 mb-0 small d-flex justify-content-between align-items-center">
                      <div>
                        <i className="bi bi-check2-circle me-1"></i>
                        تم اختيار: <strong>{(productsData || []).find((p: any) => p.id === selectedProductId)?.nameAr || (productsData || []).find((p: any) => p.id === selectedProductId)?.nameEn}</strong>
                      </div>
                      <span className="badge bg-success">{itemPrice} ج.م</span>
                    </div>
                  )}
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold">الكمية *</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0.1}
                      step="any"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold">سعر الوحدة (ج.م) *</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold">الخصم (ج.م)</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold">الضريبة %</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={itemTaxRate}
                      onChange={(e) => setItemTaxRate(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">الفني المسؤول عن هذا البند</label>
                  <select
                    className="form-select"
                    value={itemTechnicianId}
                    onChange={(e) => setItemTechnicianId(e.target.value)}
                  >
                    <option value="">-- اختياري --</option>
                    {(usersData || []).map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.firstNameAr || u.firstNameEn} {u.lastNameAr || u.lastNameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">ملاحظات البند</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ملاحظات اختيارية..."
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold"
                  disabled={!selectedProductId || itemPrice === '' || addItemMutation.isPending}
                  onClick={() => {
                    addItemMutation.mutate({
                      productId: selectedProductId,
                      quantity: itemQuantity,
                      unitPrice: Number(itemPrice),
                      discount: itemDiscount,
                      taxRate: itemTaxRate,
                      technicianId: itemTechnicianId || null,
                      notes: itemNotes || null,
                    });
                  }}
                >
                  {addItemMutation.isPending ? 'جاري الحفظ...' : 'إضافة البند وحجز المخزون'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete & Generate Invoice Modal */}
      {showCompleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">إكمال الصيانة وتوليد الفاتورة الضريبية</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCompleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="p-3 bg-light rounded mb-3 text-center">
                  <div className="text-muted small">إجمالي الفاتورة النهائي المستحق:</div>
                  <h3 className="fw-bold text-success mb-0">{grandTotal.toLocaleString()} ج.م</h3>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">طريقة السداد</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">نقدي (Cash)</option>
                    <option value="CARD">بطاقة بنكية / فيزا (POS)</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CREDIT">آجل على الحساب</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">المبلغ المسدد الآن (ج.م)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={grandTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                  />
                  <small className="text-muted">
                    المتبقي ديناً على العميل: {(grandTotal - paidAmount).toLocaleString()} ج.م
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">ملاحظات الفاتورة</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompleteModal(false)}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-success fw-bold"
                  disabled={completeMutation.isPending}
                  onClick={() => {
                    completeMutation.mutate({
                      paymentMethod,
                      paidAmount,
                      notes: completionNotes,
                    });
                  }}
                >
                  {completeMutation.isPending ? 'جاري الفوترة والخصم من المخزون...' : 'تأكيد الإكمال والفوترة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deliver Vehicle Modal */}
      {showDeliverModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">تسليم المركبة للعميل (Vehicle Handover)</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeliverModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">اسم المستلم *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">الرقم القومي للمستلم</label>
                  <input
                    type="text"
                    className="form-control"
                    value={recipientNationalId}
                    onChange={(e) => setRecipientNationalId(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">ملاحظات الاستلام والتسليم</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="تم تسليم الدراجة بحالة ممتازة ومطابقة للمطلوب..."
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeliverModal(false)}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold"
                  disabled={!recipientName || deliverMutation.isPending}
                  onClick={() => {
                    deliverMutation.mutate({
                      recipientName,
                      recipientNationalId,
                      handoverNotes,
                    });
                  }}
                >
                  {deliverMutation.isPending ? 'جاري التسليم...' : 'تأكيد التسليم'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
