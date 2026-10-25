import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBranchId } = useAuth();

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Form State
  const [form, setForm] = useState({
    branchId: '',
    customerId: '',
    deliveryDate: '',
    notes: '',
    discountTotal: 0,
    taxRate: 14,
  });

  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Queries
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['sales-orders-list', statusFilter, search, activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/orders', {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
          branchId: activeBranchId || undefined,
          limit: 100
        }
      });
      return res?.data || res;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-list-orders'],
    queryFn: async () => {
      const res: any = await apiClient.get('/customers?limit=200');
      return res?.data || res;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list-orders'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches?limit=50');
      return res?.data || res;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list-orders'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=200');
      return res?.data || res;
    },
  });

  // Create Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/sales/orders', payload);
    },
    onSuccess: () => {
      toast.success('تم إنشاء أمر البيع بنجاح');
      setShowAddModal(false);
      setOrderItems([]);
      queryClient.invalidateQueries({ queryKey: ['sales-orders-list'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'فشل حفظ أمر البيع');
    },
  });

  const handleOpenAdd = () => {
    setForm({
      branchId: activeBranchId || branchesData?.[0]?.id || '',
      customerId: customersData?.[0]?.id || '',
      deliveryDate: '',
      notes: '',
      discountTotal: 0,
      taxRate: 14,
    });
    setOrderItems([]);
    setShowAddModal(true);
  };

  const handleAddProduct = (prod: any) => {
    if (!prod) return;
    const existingIndex = orderItems.findIndex(i => i.productId === prod.id);
    if (existingIndex > -1) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: prod.id,
          productName: prod.nameAr || prod.nameEn,
          sku: prod.sku,
          quantity: 1,
          unitPrice: prod.retailPrice || 0,
          discount: 0,
          taxRate: 14,
        }
      ]);
    }
    setProductSearch('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const handleUpdateItem = (index: number, field: string, val: any) => {
    const updated = [...orderItems];
    updated[index][field] = val;
    setOrderItems(updated);
  };

  // Calculations
  const subtotal = orderItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice - (it.discount || 0)), 0);
  const taxAmount = (Math.max(0, subtotal - Number(form.discountTotal || 0)) * (Number(form.taxRate) || 14)) / 100;
  const grandTotal = Math.max(0, subtotal - Number(form.discountTotal || 0)) + taxAmount;

  const orders = Array.isArray(ordersData) ? ordersData : ordersData?.data || [];

  return (
    <div className="container-fluid p-0" dir="rtl">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-cart-check-fill text-primary me-2"></i>
            أوامر البيع (Sales Orders)
          </h3>
          <p className="text-muted mb-0">حجز وإصدار أوامر التوريد للعملاء، متابعة التسليم، والتحويل المباشر لنقاط البيع والفواتير</p>
        </div>
        <button className="btn btn-primary fw-bold d-flex align-items-center gap-1 shadow-sm" onClick={handleOpenAdd}>
          <i className="bi bi-cart-plus fs-5"></i>
          <span>إنشاء أمر بيع جديد</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="ابحث برقم الأمر أو اسم العميل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-7 d-flex gap-2 justify-content-md-end flex-wrap">
              <button
                className={`btn btn-sm ${statusFilter === '' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setStatusFilter('')}
              >
                جميع الأوامر ({orders.length})
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'PENDING' ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setStatusFilter('PENDING')}
              >
                قيد التجهيز / معلق
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'DELIVERED' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setStatusFilter('DELIVERED')}
              >
                تم التسليم والفوترة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>جاري تحميل أوامر البيع...</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-cart-x display-4 mb-3 text-secondary d-block"></i>
              <h5>لا توجد أوامر بيع مسجلة</h5>
              <p className="small">أنشئ أمر بيع جديد للعميل أو قم بتأكيد عرض سعر.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light">
                  <tr>
                    <th>رقم الأمر</th>
                    <th>العميل</th>
                    <th>الفرع</th>
                    <th>الأصناف المطلوبة</th>
                    <th>تاريخ التسليم المتوقع</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id}>
                      <td className="fw-bold font-monospace text-primary">{o.orderNo}</td>
                      <td>
                        <div className="fw-semibold">{o.customer?.nameAr || o.customer?.nameEn || 'عميل'}</div>
                        <div className="small text-muted font-monospace">{o.customer?.phone || '—'}</div>
                      </td>
                      <td>{o.branch?.nameAr || o.branch?.nameEn || 'الفرع الرئيسي'}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1 justify-content-center">
                          {(o.items || []).map((it: any) => (
                            <span key={it.id} className="badge bg-light text-dark border">
                              {it.product?.nameAr || it.product?.nameEn || 'صنف'} (x{it.quantity})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('ar-EG') : 'فوري'}</td>
                      <td className="fw-bold text-dark font-monospace">{o.grandTotal?.toLocaleString()} ج.م</td>
                      <td>
                        <span className={`badge ${o.status === 'DELIVERED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {o.status === 'DELIVERED' ? 'تم التسليم' : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 justify-content-center">
                          {o.status !== 'DELIVERED' && (
                            <button
                              className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1 shadow-sm"
                              title="تحويل أمر البيع إلى كاشير نقطة البيع وإصدار الفاتورة فوراً"
                              onClick={() => {
                                navigate('/sales/pos', { state: { convertFromOrder: o } });
                              }}
                            >
                              <i className="bi bi-calculator"></i>
                              <span>إصدار الفاتورة (POS)</span>
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            title="عرض تفاصيل أمر البيع"
                            onClick={() => setSelectedOrder(o)}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Sales Order */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered my-4" style={{ maxHeight: '92vh' }}>
            <div className="modal-content border-0 shadow-lg d-flex flex-column" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-primary text-white flex-shrink-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-cart-plus me-2"></i>
                  إنشاء أمر بيع جديد للعميل
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>

              <form
                className="d-flex flex-column flex-grow-1 overflow-hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (orderItems.length === 0) {
                    toast.error('يجب إضافة صنف واحد على الأقل في أمر البيع');
                    return;
                  }
                  createOrderMutation.mutate({
                    ...form,
                    discountTotal: Number(form.discountTotal) || 0,
                    taxRate: Number(form.taxRate) || 14,
                    items: orderItems.map(it => ({
                      productId: it.productId,
                      quantity: Number(it.quantity) || 1,
                      unitPrice: Number(it.unitPrice) || 0,
                      discount: Number(it.discount) || 0,
                      taxRate: Number(it.taxRate) || 14,
                    }))
                  });
                }}
              >
                <div className="modal-body p-4 flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                  {/* Top Details */}
                  <div className="card border mb-3">
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">العميل *</label>
                          <select
                            className="form-select form-select-sm"
                            required
                            value={form.customerId}
                            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                          >
                            <option value="">-- اختر العميل --</option>
                            {(customersData || []).map((c: any) => (
                              <option key={c.id} value={c.id}>{c.nameAr || c.nameEn} ({c.phone || c.customerCode})</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">الفرع *</label>
                          <select
                            className="form-select form-select-sm"
                            required
                            value={form.branchId}
                            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                          >
                            <option value="">-- اختر الفرع --</option>
                            {(branchesData || []).map((b: any) => (
                              <option key={b.id} value={b.id}>{b.nameAr || b.nameEn}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">تاريخ التسليم المتوقع</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={form.deliveryDate}
                            onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Items Section */}
                  <div className="card border mb-3">
                    <div className="card-header bg-light py-2">
                      <h6 className="mb-0 fw-bold">أصناف أمر البيع</h6>
                    </div>
                    <div className="card-body">
                      <div className="position-relative mb-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="ابحث عن صنف أو سكوتر لإضافته لأمر البيع..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                        {productSearch && (
                          <div className="position-absolute w-100 bg-white border shadow rounded mt-1 z-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {(productsData || [])
                              .filter((p: any) =>
                                (p.nameAr && p.nameAr.includes(productSearch)) ||
                                (p.nameEn && p.nameEn.toLowerCase().includes(productSearch.toLowerCase())) ||
                                (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                              )
                              .slice(0, 8)
                              .map((p: any) => (
                                <div
                                  key={p.id}
                                  className="p-2 border-bottom cursor-pointer hover-bg-light d-flex justify-content-between align-items-center"
                                  onClick={() => handleAddProduct(p)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div>
                                    <span className="fw-semibold">{p.nameAr || p.nameEn}</span>
                                    <span className="badge bg-secondary ms-2 small">{p.sku}</span>
                                  </div>
                                  <span className="text-primary fw-bold font-monospace">{p.retailPrice || 0} ج.م</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {orderItems.length > 0 && (
                        <div className="table-responsive">
                          <table className="table table-bordered table-sm align-middle text-center mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>الصنف</th>
                                <th style={{ width: '100px' }}>الكمية</th>
                                <th style={{ width: '130px' }}>سعر الوحدة</th>
                                <th style={{ width: '110px' }}>الخصم</th>
                                <th>الإجمالي</th>
                                <th style={{ width: '40px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderItems.map((it, idx) => (
                                <tr key={idx}>
                                  <td className="text-start fw-semibold">{it.productName}</td>
                                  <td>
                                    <input
                                      type="number"
                                      min="1"
                                      className="form-control form-control-sm text-center"
                                      value={it.quantity}
                                      onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control form-control-sm text-center"
                                      value={it.unitPrice}
                                      onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control form-control-sm text-center"
                                      value={it.discount}
                                      onChange={(e) => handleUpdateItem(idx, 'discount', Number(e.target.value))}
                                    />
                                  </td>
                                  <td className="font-monospace fw-bold">
                                    {((it.quantity * it.unitPrice) - (it.discount || 0)).toFixed(2)} ج.م
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm p-1"
                                      onClick={() => handleRemoveItem(idx)}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financials & Notes */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">ملاحظات أمر البيع</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="أي تفاصيل خاصة بالتسليم أو شروط البيع..."
                      ></textarea>
                    </div>
                    <div className="col-md-6">
                      <div className="card bg-light border p-3">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="small">المجموع الفرعي:</span>
                          <span className="fw-bold font-monospace">{subtotal.toFixed(2)} ج.م</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small">الخصم الإضافي:</span>
                          <input
                            type="number"
                            className="form-control form-control-sm text-end"
                            style={{ width: '120px' }}
                            value={form.discountTotal}
                            onChange={(e) => setForm({ ...form, discountTotal: Number(e.target.value) })}
                          />
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small">ضريبة القيمة المضافة ({form.taxRate}%):</span>
                          <span className="fw-bold font-monospace text-secondary">{taxAmount.toFixed(2)} ج.م</span>
                        </div>
                        <hr className="my-2" />
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold text-primary">الإجمالي النهائي:</span>
                          <span className="fw-bold fs-5 text-primary font-monospace">{grandTotal.toFixed(2)} ج.م</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light flex-shrink-0">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary fw-bold" disabled={createOrderMutation.isPending || orderItems.length === 0}>
                    {createOrderMutation.isPending ? 'جاري الحفظ...' : 'حفظ وتأكيد أمر البيع'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Order Details */}
      {selectedOrder && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-receipt me-2 text-warning"></i>
                  تفاصيل أمر البيع رقم: <span className="text-warning font-monospace">{selectedOrder.orderNo}</span>
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedOrder(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-6 col-md-4">
                    <span className="text-muted small d-block">العميل</span>
                    <span className="fw-bold">{selectedOrder.customer?.nameAr || selectedOrder.customer?.nameEn}</span>
                  </div>
                  <div className="col-6 col-md-4">
                    <span className="text-muted small d-block">الهاتف</span>
                    <span className="font-monospace">{selectedOrder.customer?.phone || '—'}</span>
                  </div>
                  <div className="col-6 col-md-4">
                    <span className="text-muted small d-block">الفرع</span>
                    <span>{selectedOrder.branch?.nameAr || selectedOrder.branch?.nameEn}</span>
                  </div>
                  <div className="col-6 col-md-4">
                    <span className="text-muted small d-block">التاريخ</span>
                    <span>{new Date(selectedOrder.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="col-6 col-md-4">
                    <span className="text-muted small d-block">تاريخ التسليم</span>
                    <span>{selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleDateString('ar-EG') : 'فوري'}</span>
                  </div>
                  <div className="col-6 col-md-4">
                    <span className="text-muted small d-block">الحالة</span>
                    <span className={`badge ${selectedOrder.status === 'DELIVERED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {selectedOrder.status === 'DELIVERED' ? 'تم التسليم' : 'قيد الانتظار'}
                    </span>
                  </div>
                </div>

                <h6 className="fw-bold border-bottom pb-2">الأصناف المطلوبة</h6>
                <div className="table-responsive mb-3">
                  <table className="table table-bordered table-sm text-center align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>الصنف</th>
                        <th>الكمية</th>
                        <th>سعر الوحدة</th>
                        <th>الخصم</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it: any, idx: number) => (
                        <tr key={it.id || idx}>
                          <td>{idx + 1}</td>
                          <td className="text-start fw-semibold">{it.product?.nameAr || it.product?.nameEn}</td>
                          <td>{it.quantity}</td>
                          <td>{it.unitPrice} ج.م</td>
                          <td>{it.discount || 0} ج.م</td>
                          <td className="fw-bold font-monospace">{it.totalPrice?.toFixed(2)} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between p-3 bg-light rounded">
                  <span className="fw-bold">الإجمالي الكلي:</span>
                  <span className="fw-bold fs-5 text-primary font-monospace">{selectedOrder.grandTotal?.toFixed(2)} ج.م</span>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>إغلاق</button>
                {selectedOrder.status !== 'DELIVERED' && (
                  <button
                    type="button"
                    className="btn btn-success fw-bold d-flex align-items-center gap-1"
                    onClick={() => {
                      const o = selectedOrder;
                      setSelectedOrder(null);
                      navigate('/sales/pos', { state: { convertFromOrder: o } });
                    }}
                  >
                    <i className="bi bi-calculator"></i>
                    <span>تحويل للكاشير وإصدار الفاتورة فوراً</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
