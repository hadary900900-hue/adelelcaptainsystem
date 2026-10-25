import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { activeBranchId } = useAuth();
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    supplierId: '',
    branchId: '',
    expectedDate: '',
    discountTotal: 0,
    taxRate: 14,
    notes: '',
  });

  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list-po'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/suppliers?limit=100');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list-po'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=200');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['purchase-orders-list', search, supplierId, status, activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/orders', {
        params: {
          search: search || undefined,
          supplierId: supplierId || undefined,
          status: status || undefined,
          branchId: activeBranchId || undefined,
          limit: 100,
        },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/purchasing/orders', payload);
    },
    onSuccess: () => {
      alert('تم إنشاء أمر الشراء بنجاح');
      setShowAddModal(false);
      setOrderItems([]);
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل حفظ أمر الشراء');
    },
  });

  const handleOpenAdd = () => {
    setForm({
      supplierId: suppliersData?.[0]?.id || '',
      branchId: activeBranchId || '',
      expectedDate: '',
      discountTotal: 0,
      taxRate: 14,
      notes: '',
    });
    setOrderItems([]);
    setShowAddModal(true);
  };

  const handleAddProduct = (prod: any) => {
    if (!prod) return;
    setOrderItems([
      ...orderItems,
      {
        productId: prod.id,
        productName: prod.nameAr || prod.nameEn,
        sku: prod.sku,
        quantity: 1,
        unitCost: prod.costPrice || 0,
        discount: 0,
        taxRate: 14,
      },
    ]);
    setProductSearch('');
  };

  const orders = ordersData || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">أوامر الشراء (Purchase Orders)</h3>
          <p className="text-muted mb-0">إصدار أوامر التوريد للموردين ومتابعة الكميات المستلمة والمتبقية</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <i className="bi bi-cart-plus me-1"></i> إنشاء أمر شراء جديد
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="ابحث برقم أمر الشراء أو المورد..."
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
            <div className="col-md-3">
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">جميع الحالات</option>
                <option value="PENDING">معلق (Pending)</option>
                <option value="PARTIALLY_RECEIVED">مستلم جزئياً</option>
                <option value="RECEIVED">مستلم بالكامل</option>
              </select>
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
                  <th>رقم الأمر</th>
                  <th>المورد</th>
                  <th>التاريخ</th>
                  <th>تاريخ التوريد المتوقع</th>
                  <th>الإجمالي</th>
                  <th>حالة التوريد</th>
                  <th>إذونات الاستلام</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-4 text-center">جاري التحميل...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} className="py-5 text-muted text-center">لا توجد أوامر شراء حتى الآن.</td></tr>
                ) : (
                  orders.map((po: any) => (
                    <tr key={po.id}>
                      <td className="fw-bold font-monospace text-primary">{po.orderNo}</td>
                      <td className="fw-semibold">{po.supplier?.nameAr || po.supplier?.nameEn}</td>
                      <td>{new Date(po.orderDate).toLocaleDateString('ar-EG')}</td>
                      <td>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('ar-EG') : '—'}</td>
                      <td className="font-monospace fw-bold">{po.grandTotal.toFixed(2)} ج.م</td>
                      <td>
                        <span className={`badge ${po.status === 'RECEIVED' ? 'bg-success' : po.status === 'PARTIALLY_RECEIVED' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                          {po.status === 'RECEIVED' ? 'مستلم بالكامل' : po.status === 'PARTIALLY_RECEIVED' ? 'مستلم جزئياً' : 'معلق'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {po.goodsReceipts?.length || 0} إذن استلام
                        </span>
                      </td>
                      <td>
                        {po.status !== 'RECEIVED' ? (
                          <button
                            className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1 mx-auto"
                            title="تحويل أمر الشراء إلى إذن استلام بضاعة واردة بالمخزن"
                            onClick={() => {
                              navigate('/purchasing/goods-receipts', { state: { convertFromPO: po } });
                            }}
                          >
                            <i className="bi bi-box-arrow-in-down"></i>
                            <span>تحويل لإذن استلام</span>
                          </button>
                        ) : (
                          <span className="text-muted small">
                            <i className="bi bi-check2-circle text-success me-1"></i>تم الاستلام
                          </span>
                        )}
                      </td>
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
          <div className="modal-dialog modal-xl modal-dialog-centered my-4" style={{ maxHeight: '92vh' }}>
            <div className="modal-content border-0 shadow-lg d-flex flex-column" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-primary text-white flex-shrink-0">
                <h5 className="modal-title fw-bold"><i className="bi bi-cart-plus me-2"></i>إنشاء أمر شراء جديد</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form
                className="d-flex flex-column flex-grow-1 overflow-hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (orderItems.length === 0) {
                    alert('يجب إضافة صنف واحد على الأقل');
                    return;
                  }
                  createOrderMutation.mutate({ ...form, items: orderItems });
                }}
              >
                <div className="modal-body p-4 flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                  <div className="card border mb-3">
                    <div className="card-body">
                      <div className="row g-3">
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
                          <label className="form-label small fw-semibold">تاريخ التوريد المتوقع</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={form.expectedDate}
                            onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card border mb-3">
                    <div className="card-header bg-light py-2">
                      <h6 className="mb-0 fw-bold">إضافة أصناف لأمر الشراء</h6>
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
                                <span className="badge bg-primary">اختيار</span>
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
                          <th style={{ width: '100px' }}>الكمية</th>
                          <th style={{ width: '130px' }}>سعر التكلفة المتوقع</th>
                          <th style={{ width: '140px' }}>الإجمالي</th>
                          <th style={{ width: '50px' }}>حذف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map((item, idx) => (
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
                                  const list = [...orderItems];
                                  list[idx].quantity = Number(e.target.value);
                                  setOrderItems(list);
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
                                  const list = [...orderItems];
                                  list[idx].unitCost = Number(e.target.value);
                                  setOrderItems(list);
                                }}
                              />
                            </td>
                            <td className="fw-bold font-monospace text-primary">
                              {((item.quantity * item.unitCost) * 1.14).toFixed(2)} ج.م
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  const list = [...orderItems];
                                  list.splice(idx, 1);
                                  setOrderItems(list);
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

                <div className="modal-footer bg-light flex-shrink-0">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary fw-bold" disabled={createOrderMutation.isPending || orderItems.length === 0}>
                    {createOrderMutation.isPending ? 'جاري الحفظ...' : 'حفظ وإرسال أمر الشراء'}
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
