import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function GoodsReceiptsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeBranchId } = useAuth();
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [receiptForm, setReceiptForm] = useState({
    branchId: '',
    warehouseId: '',
    supplierId: '',
    purchaseOrderId: '',
    notes: '',
  });

  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Fetch Suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list-select'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/suppliers?limit=100');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list-select'],
    queryFn: async () => {
      const res: any = await apiClient.get('/warehouses');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Products Catalog
  const { data: productsData } = useQuery({
    queryKey: ['products-list-for-receipt'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=200');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Goods Receipts
  const { data: receiptsData, isLoading, refetch } = useQuery({
    queryKey: ['goods-receipts-list', search, supplierId, activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/goods-receipts', {
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

  const createReceiptMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/purchasing/goods-receipts', payload);
    },
    onSuccess: () => {
      alert('تم تسجيل إذن استلام البضاعة وتحديث المخزون بنجاح!');
      setShowAddModal(false);
      setReceiptItems([]);
      setReceiptForm({
        branchId: '',
        warehouseId: '',
        supplierId: '',
        purchaseOrderId: '',
        notes: '',
      });
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل تسجيل إذن الاستلام');
    },
  });

  // Handle automatic conversion from Purchase Order if navigated with state
  useEffect(() => {
    const po = (location.state as any)?.convertFromPO;
    if (po && warehousesData?.length) {
      const defaultWh = warehousesData[0]?.id || '';
      const defaultBr = po.branchId || activeBranchId || warehousesData[0]?.branchId || '';
      
      setReceiptForm({
        branchId: defaultBr,
        warehouseId: defaultWh,
        supplierId: po.supplierId || '',
        purchaseOrderId: po.id || '',
        notes: `استلام بضاعة لأمر الشراء رقم: ${po.orderNo}`,
      });

      const items = (po.items || []).map((it: any) => {
        const isVehicle = it.product?.type === 'VEHICLE';
        return {
          productId: it.productId,
          productName: it.product?.nameAr || it.product?.nameEn || 'صنف',
          sku: it.product?.sku || '',
          type: it.product?.type,
          quantity: it.quantity || 1,
          unitCost: it.unitCost || 0,
          vin: isVehicle ? '' : null,
          engineNumber: isVehicle ? '' : null,
          color: isVehicle ? 'أبيض' : null,
          modelYear: isVehicle ? new Date().getFullYear() : null,
        };
      });

      setReceiptItems(items);
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, warehousesData]);

  const handleOpenAdd = () => {
    const defaultWh = warehousesData?.[0]?.id || '';
    const defaultBr = activeBranchId || warehousesData?.[0]?.branchId || '';
    setReceiptForm({
      branchId: defaultBr,
      warehouseId: defaultWh,
      supplierId: suppliersData?.[0]?.id || '',
      purchaseOrderId: '',
      notes: '',
    });
    setReceiptItems([]);
    setShowAddModal(true);
  };

  const handleAddProduct = (prod: any) => {
    if (!prod) return;
    const isVehicle = prod.type === 'VEHICLE';

    setReceiptItems([
      ...receiptItems,
      {
        productId: prod.id,
        productName: prod.nameAr || prod.nameEn,
        sku: prod.sku,
        type: prod.type,
        quantity: 1,
        unitCost: prod.costPrice || 0,
        // Vehicle specific fields
        vin: isVehicle ? '' : null,
        engineNumber: isVehicle ? '' : null,
        color: isVehicle ? 'أبيض' : null,
        modelYear: isVehicle ? new Date().getFullYear() : null,
      },
    ]);
    setProductSearch('');
  };

  const handleRemoveItem = (index: number) => {
    const list = [...receiptItems];
    list.splice(index, 1);
    setReceiptItems(list);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const list = [...receiptItems];
    list[index][field] = value;
    setReceiptItems(list);
  };

  const receipts = receiptsData || [];

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">إذونات استلام البضاعة (Goods Receipt - وارد المخزن)</h3>
          <p className="text-muted mb-0">استلام الواردات، فحص أرقام الشاسيه والموتور للدراجات، وتحديث أرصدة المخازن آلياً</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <i className="bi bi-box-arrow-in-down me-1"></i> استلام بضاعة جديدة (وارد)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="ابحث برقم إذن الاستلام أو اسم المورد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">جميع الموردين</option>
                {(suppliersData || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nameAr || s.nameEn} ({s.supplierCode})</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 text-end">
              <span className="text-muted small">إجمالي الإذونات: <strong>{receipts.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th>رقم الإذن</th>
                  <th>المورد</th>
                  <th>المستودع / الفرع</th>
                  <th>تاريخ الاستلام</th>
                  <th>الأصناف المستلمة</th>
                  <th>المسؤول عن الاستلام</th>
                  <th>حالة الفاتورة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-4 text-center">جاري التحميل...</td></tr>
                ) : receipts.length === 0 ? (
                  <tr><td colSpan={8} className="py-5 text-muted text-center">لا توجد إذونات استلام حتى الآن.</td></tr>
                ) : (
                  receipts.map((gr: any) => (
                    <tr key={gr.id}>
                      <td className="fw-bold font-monospace text-primary">{gr.receiptNo}</td>
                      <td className="fw-semibold">{gr.supplier?.nameAr || gr.supplier?.nameEn}</td>
                      <td>
                        <div>{gr.warehouse?.nameAr || gr.warehouse?.nameEn}</div>
                        <div className="text-muted small">{gr.branch?.nameAr || gr.branch?.nameEn}</div>
                      </td>
                      <td>{new Date(gr.receiptDate).toLocaleDateString('ar-EG')}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1 justify-content-center">
                          {gr.items?.map((it: any) => (
                            <span key={it.id} className="badge bg-light text-dark border">
                              {it.product?.nameAr || it.product?.nameEn} ({it.quantity})
                              {it.vin && <span className="text-primary ms-1">VIN: {it.vin}</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{gr.receivedBy?.firstNameAr || gr.receivedBy?.firstNameEn || '—'}</td>
                      <td>
                        {gr.purchaseInvoice ? (
                          <span className="badge bg-success-subtle text-success">
                            فاتورة {gr.purchaseInvoice.invoiceNo}
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning">بانتظار الفاتورة</span>
                        )}
                      </td>
                      <td>
                        {!gr.purchaseInvoice ? (
                          <button
                            className="btn btn-sm btn-primary fw-bold d-flex align-items-center gap-1 mx-auto"
                            title="تحويل إذن الاستلام إلى فاتورة شراء"
                            onClick={() => {
                              navigate('/purchasing/invoices', { state: { convertFromGR: gr } });
                            }}
                          >
                            <i className="bi bi-receipt"></i>
                            <span>تحويل لفاتورة شراء</span>
                          </button>
                        ) : (
                          <span className="text-success small fw-semibold">
                            <i className="bi bi-check-circle me-1"></i>تمت الفوترة
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

      {/* Modal: New Goods Receipt */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered my-4" style={{ maxHeight: '92vh' }}>
            <div className="modal-content border-0 shadow-lg d-flex flex-column" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-success text-white flex-shrink-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-box-arrow-in-down me-2"></i>
                  تسجيل إذن استلام بضاعة واردة (Goods Receipt)
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>

              <form
                className="d-flex flex-column flex-grow-1 overflow-hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (receiptItems.length === 0) {
                    alert('يجب إضافة صنف واحد على الأقل للاستلام');
                    return;
                  }
                  createReceiptMutation.mutate({
                    ...receiptForm,
                    items: receiptItems,
                  });
                }}
              >
                <div className="modal-body p-4 flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                  {/* Top Metadata */}
                  <div className="card border mb-3">
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">المورد *</label>
                          <select
                            className="form-select form-select-sm"
                            required
                            value={receiptForm.supplierId}
                            onChange={(e) => setReceiptForm({ ...receiptForm, supplierId: e.target.value })}
                          >
                            <option value="">-- اختر المورد --</option>
                            {(suppliersData || []).map((s: any) => (
                              <option key={s.id} value={s.id}>{s.nameAr || s.nameEn} ({s.supplierCode})</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">المستودع المستلم *</label>
                          <select
                            className="form-select form-select-sm"
                            required
                            value={receiptForm.warehouseId}
                            onChange={(e) => {
                              const wh = (warehousesData || []).find((w: any) => w.id === e.target.value);
                              setReceiptForm({
                                ...receiptForm,
                                warehouseId: e.target.value,
                                branchId: wh?.branchId || receiptForm.branchId,
                              });
                            }}
                          >
                            <option value="">-- اختر المستودع --</option>
                            {(warehousesData || []).map((w: any) => (
                              <option key={w.id} value={w.id}>{w.nameAr || w.nameEn}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">ملاحظات الاستلام</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="رقم البوليصة أو السائق..."
                            value={receiptForm.notes}
                            onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Search */}
                  <div className="card border mb-3">
                    <div className="card-header bg-light py-2">
                      <h6 className="mb-0 fw-bold">إضافة صنف أو دراجة للاستلام</h6>
                    </div>
                    <div className="card-body">
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="ابحث باسم الدراجة أو قطعة الغيار أو الكود لإضافتها..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                        {productSearch.trim().length > 0 && (
                          <div className="position-absolute bg-white border rounded shadow w-100 z-3 overflow-auto mt-1" style={{ maxHeight: '180px' }}>
                            {(productsData || [])
                              .filter((p: any) =>
                                p.nameAr?.toLowerCase().includes(productSearch.toLowerCase()) ||
                                p.nameEn?.toLowerCase().includes(productSearch.toLowerCase()) ||
                                p.sku?.toLowerCase().includes(productSearch.toLowerCase())
                              )
                              .map((p: any) => (
                                <div
                                  key={p.id}
                                  className="p-2 border-bottom hover-bg-light cursor-pointer d-flex justify-content-between align-items-center"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleAddProduct(p)}
                                >
                                  <div>
                                    <strong>{p.nameAr || p.nameEn}</strong>
                                    <span className="text-muted small ms-2">({p.sku})</span>
                                  </div>
                                  <span className={`badge ${p.type === 'VEHICLE' ? 'bg-primary' : 'bg-secondary'}`}>
                                    {p.type === 'VEHICLE' ? 'مركبة / دراجة' : 'قطعة غيار'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <h6 className="fw-bold mb-2">الأصناف المطلوب استلامها في المخزن ({receiptItems.length})</h6>
                  {receiptItems.length === 0 ? (
                    <div className="alert alert-light text-center border py-4 text-muted">
                      لم يتم إضافة أي أصناف بعد. ابحث في الحقل أعلاه لاختيار الأصناف.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle text-center mb-0" style={{ fontSize: '0.82rem' }}>
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th className="text-start">الصنف</th>
                            <th>النوع</th>
                            <th style={{ width: '90px' }}>الكمية</th>
                            <th style={{ width: '130px' }}>سعر التكلفة (ج.م)</th>
                            <th>تفاصيل المركبة (رقم الشاسيه VIN والموتور واللون)</th>
                            <th style={{ width: '50px' }}>حذف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptItems.map((item, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td className="text-start">
                                <div className="fw-bold">{item.productName}</div>
                                <div className="text-muted small">كود: {item.sku}</div>
                              </td>
                              <td>
                                <span className={`badge ${item.type === 'VEHICLE' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'}`}>
                                  {item.type === 'VEHICLE' ? 'دراجة' : 'قطعة'}
                                </span>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  min={1}
                                  disabled={item.type === 'VEHICLE'} // Vehicles are uniquely 1 unit per VIN
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center font-monospace"
                                  min={0}
                                  step="any"
                                  value={item.unitCost}
                                  onChange={(e) => handleUpdateItem(idx, 'unitCost', Number(e.target.value))}
                                />
                              </td>
                              <td>
                                {item.type === 'VEHICLE' ? (
                                  <div className="row g-1">
                                    <div className="col-md-5">
                                      <input
                                        type="text"
                                        className="form-control form-control-sm font-monospace text-uppercase"
                                        placeholder="رقم الشاسيه (VIN) *"
                                        required
                                        value={item.vin || ''}
                                        onChange={(e) => handleUpdateItem(idx, 'vin', e.target.value)}
                                      />
                                    </div>
                                    <div className="col-md-4">
                                      <input
                                        type="text"
                                        className="form-control form-control-sm font-monospace text-uppercase"
                                        placeholder="رقم الموتور *"
                                        required
                                        value={item.engineNumber || ''}
                                        onChange={(e) => handleUpdateItem(idx, 'engineNumber', e.target.value)}
                                      />
                                    </div>
                                    <div className="col-md-3">
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="اللون"
                                        value={item.color || ''}
                                        onChange={(e) => handleUpdateItem(idx, 'color', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted small">قطعة غيار / صنف مخزني عام</span>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
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

                <div className="modal-footer bg-light flex-shrink-0">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-success fw-bold" disabled={createReceiptMutation.isPending || receiptItems.length === 0}>
                    {createReceiptMutation.isPending ? 'جاري الاستلام وتحديث المخزون...' : 'تأكيد الاستلام وإدخال المخزن'}
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
