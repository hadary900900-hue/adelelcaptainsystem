import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function PosPage() {
  const queryClient = useQueryClient();
  const location = useLocation();

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceType, setInvoiceType] = useState('CASH');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');

  // Discount & Tax settings
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [isTaxEnabled, setIsTaxEnabled] = useState<boolean>(true);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(14);

  // Customer search & quick add
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    nameAr: '',
    nameEn: '',
    phone: '',
    type: 'INDIVIDUAL',
    priceTier: 'RETAIL',
    nationalId: '',
    address: '',
  });

  // Product search filter
  const [productCatalogSearch, setProductCatalogSearch] = useState('');

  // Cart: lines = { productId, vehicleUnitId?, name, sku, unitPrice, quantity, discount, taxRate, maxAvailable, isVehicle }
  const [cart, setCart] = useState<any[]>([]);
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);

  // Queries
  const { data: branchesData } = useQuery({
    queryKey: ['branches-pos'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches?limit=100');
      const b = res?.data || res;
      if (b?.length > 0 && !selectedBranchId) {
        setSelectedBranchId(b[0].id);
      }
      return b;
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-pos', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res: any = await apiClient.get('/warehouses', { params: { branchId: selectedBranchId, limit: 50 } });
      const w = res?.data || res;
      if (w?.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(w[0].id);
      }
      return w;
    },
    enabled: !!selectedBranchId,
  });

  const { data: customersData, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers-pos'],
    queryFn: async () => {
      const res: any = await apiClient.get('/customers?limit=200');
      const c = res?.data || res;
      if (c?.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(c[0].id);
      }
      return c;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-catalog-pos'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=300');
      return res?.data || res;
    },
  });

  const { data: availableVehicles } = useQuery({
    queryKey: ['vehicles-available-pos', selectedWarehouseId],
    queryFn: async () => {
      if (!selectedWarehouseId) return [];
      const res: any = await apiClient.get('/vehicles', {
        params: { warehouseId: selectedWarehouseId, status: 'AVAILABLE', limit: 150 }
      });
      return res?.data || res;
    },
    enabled: !!selectedWarehouseId,
  });

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    const list = customersData || [];
    if (!customerSearchQuery.trim()) return list;
    const q = customerSearchQuery.toLowerCase();
    return list.filter((c: any) =>
      (c.nameAr && c.nameAr.toLowerCase().includes(q)) ||
      (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(q))
    );
  }, [customersData, customerSearchQuery]);

  const selectedCustomer = useMemo(() => {
    return (customersData || []).find((c: any) => c.id === selectedCustomerId);
  }, [customersData, selectedCustomerId]);

  // Load items if converted from Sales Order (OrdersPage)
  useEffect(() => {
    const order = (location.state as any)?.convertFromOrder;
    if (order) {
      if (order.branchId) setSelectedBranchId(order.branchId);
      if (order.customerId) setSelectedCustomerId(order.customerId);
      if (order.notes) setNotes(`أمر بيع رقم: ${order.orderNo} - ${order.notes || ''}`);
      if (order.discountTotal) setDiscountTotal(order.discountTotal);

      const items = (order.items || []).map((it: any) => ({
        productId: it.productId,
        name: it.product?.nameAr || it.product?.nameEn || 'صنف',
        sku: it.product?.sku || '',
        unitPrice: it.unitPrice || 0,
        quantity: it.quantity || 1,
        discount: it.discount || 0,
        taxRate: it.taxRate || 14,
        isVehicle: it.product?.type === 'VEHICLE',
        vehicleUnitId: it.vehicleUnitId || null,
      }));

      setCart(items);
      toast.success(`تم تحميل بيانات أمر البيع ${order.orderNo}`);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Filtered products for catalog search
  const filteredCatalogProducts = useMemo(() => {
    const all = (productsData || []).filter((p: any) => p.type !== 'VEHICLE');
    if (!productCatalogSearch.trim()) return all;
    const q = productCatalogSearch.toLowerCase();
    return all.filter((p: any) =>
      (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q))
    );
  }, [productsData, productCatalogSearch]);

  // Filtered vehicles for catalog search
  const filteredVehicles = useMemo(() => {
    const all = availableVehicles || [];
    if (!productCatalogSearch.trim()) return all;
    const q = productCatalogSearch.toLowerCase();
    return all.filter((v: any) =>
      (v.vin && v.vin.toLowerCase().includes(q)) ||
      (v.engineNumber && v.engineNumber.toLowerCase().includes(q)) ||
      (v.product?.nameEn && v.product.nameEn.toLowerCase().includes(q)) ||
      (v.product?.nameAr && v.product.nameAr.toLowerCase().includes(q)) ||
      (v.color && v.color.toLowerCase().includes(q))
    );
  }, [availableVehicles, productCatalogSearch]);

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity - (item.discount || 0)), 0);
  }, [cart]);

  const effectiveTaxRate = isTaxEnabled ? taxRatePercent : 0;

  const taxableBase = useMemo(() => {
    return Math.max(0, subtotal - discountTotal);
  }, [subtotal, discountTotal]);

  const taxAmount = useMemo(() => {
    if (!isTaxEnabled) return 0;
    return Math.round((taxableBase * effectiveTaxRate) / 100);
  }, [taxableBase, isTaxEnabled, effectiveTaxRate]);

  const grandTotal = useMemo(() => {
    return Math.max(0, taxableBase + taxAmount);
  }, [taxableBase, taxAmount]);

  const addToCart = (product: any, vehicleUnit?: any) => {
    if (vehicleUnit) {
      const inCart = cart.find(i => i.vehicleUnitId === vehicleUnit.id);
      if (inCart) {
        toast.error(`المركبة برقم شاسيه ${vehicleUnit.vin} مضافة بالفعل في الفاتورة!`);
        return;
      }

      const isB2B = selectedCustomer?.priceTier === 'B2B';
      const effectivePrice = isB2B && vehicleUnit.b2bPrice > 0 ? vehicleUnit.b2bPrice : (vehicleUnit.sellingPrice || product.retailPrice);

      setCart([
        ...cart,
        {
          productId: product.id,
          vehicleUnitId: vehicleUnit.id,
          name: `${product.nameAr || product.nameEn} (شاسيه: ${vehicleUnit.vin} / ${vehicleUnit.color})`,
          sku: product.sku,
          unitPrice: effectivePrice,
          quantity: 1,
          discount: 0,
          taxRate: 14,
          isVehicle: true,
          vin: vehicleUnit.vin,
          engineNumber: vehicleUnit.engineNumber,
        }
      ]);
      toast.success(`تمت إضافة المركبة ${vehicleUnit.vin}`);
      return;
    }

    const existingIndex = cart.findIndex(i => i.productId === product.id && !i.vehicleUnitId);
    const isB2B = selectedCustomer?.priceTier === 'B2B';
    const effectivePrice = isB2B && product.b2bPrice > 0 ? product.b2bPrice : product.retailPrice;

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.nameAr || product.nameEn,
          sku: product.sku,
          unitPrice: effectivePrice,
          quantity: 1,
          discount: 0,
          taxRate: 14,
          isVehicle: false,
        }
      ]);
    }
  };

  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const updateQuantity = (index: number, qty: number) => {
    const updated = [...cart];
    if (updated[index].isVehicle) {
      toast.error('المركبات تباع برقم شاسيه فردي (1 قطعة لكل شاسيه)');
      return;
    }
    updated[index].quantity = Math.max(1, qty);
    setCart(updated);
  };

  const updatePrice = (index: number, price: number) => {
    const updated = [...cart];
    updated[index].unitPrice = Math.max(0, price);
    setCart(updated);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearch.trim()) return;

    const foundProduct = (productsData || []).find((p: any) =>
      p.sku.toLowerCase() === barcodeSearch.trim().toLowerCase() ||
      p.barcode === barcodeSearch.trim()
    );

    if (foundProduct) {
      if (foundProduct.type === 'VEHICLE') {
        const matchedUnit = (availableVehicles || []).find((v: any) =>
          v.productId === foundProduct.id || v.vin.toLowerCase() === barcodeSearch.trim().toLowerCase()
        );
        if (matchedUnit) {
          addToCart(foundProduct, matchedUnit);
        } else {
          toast.error(`لا توجد وحدات متاحة في المخزن المحدد للمركبة ${foundProduct.nameAr || foundProduct.nameEn}`);
        }
      } else {
        addToCart(foundProduct);
      }
      setBarcodeSearch('');
      return;
    }

    const foundUnit = (availableVehicles || []).find((v: any) =>
      v.vin.toLowerCase() === barcodeSearch.trim().toLowerCase()
    );

    if (foundUnit) {
      addToCart(foundUnit.product, foundUnit);
      setBarcodeSearch('');
      return;
    }

    toast.error('لم يتم العثور على صنف بالباركود أو الكود أو رقم الشاسيه');
  };

  // Quick Customer Creation Mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const code = `CUST-${Date.now().toString().slice(-6)}`;
      const res: any = await apiClient.post('/customers', {
        ...payload,
        customerCode: code,
      });
      return res?.data || res;
    },
    onSuccess: (newCust: any) => {
      toast.success('تم إضافة العميل بنجاح واختياره');
      queryClient.invalidateQueries({ queryKey: ['customers-pos'] });
      refetchCustomers();
      setSelectedCustomerId(newCust.id);
      setShowAddCustomerModal(false);
      setNewCustomerForm({
        nameAr: '',
        nameEn: '',
        phone: '',
        type: 'INDIVIDUAL',
        priceTier: 'RETAIL',
        nationalId: '',
        address: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'فشل إضافة العميل');
    },
  });

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.phone.trim()) {
      toast.error('رقم الهاتف مطلوب');
      return;
    }
    const nameAr = newCustomerForm.nameAr.trim() || newCustomerForm.nameEn.trim();
    const nameEn = newCustomerForm.nameEn.trim() || newCustomerForm.nameAr.trim();
    if (!nameAr) {
      toast.error('اسم العميل مطلوب');
      return;
    }

    addCustomerMutation.mutate({
      ...newCustomerForm,
      nameAr,
      nameEn,
    });
  };

  const checkoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post('/sales/invoices', payload);
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles-available-pos'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      toast.success('تم إتمام البيع بنجاح وإصدار الفاتورة!');
      setCompletedInvoice(data);
      setCart([]);
      setPaidAmount(0);
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'فشل إتمام البيع');
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('سلة المبيعات فارغة');
      return;
    }
    if (!selectedBranchId || !selectedWarehouseId || !selectedCustomerId) {
      toast.error('يجب اختيار الفرع، المخزن، والعميل');
      return;
    }

    checkoutMutation.mutate({
      branchId: selectedBranchId,
      warehouseId: selectedWarehouseId,
      customerId: selectedCustomerId,
      invoiceType,
      paidAmount: invoiceType === 'CASH' ? grandTotal : paidAmount,
      paymentMethod,
      discountTotal,
      taxRate: effectiveTaxRate,
      notes,
      items: cart.map(i => ({
        productId: i.productId,
        vehicleUnitId: i.vehicleUnitId || null,
        description: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount || 0,
        taxRate: effectiveTaxRate,
      }))
    });
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-0">نقطة البيع (POS)</h3>
          <p className="text-muted small mb-0">بيع مباشر بصالة العرض، ربط أرقام الشاسيه (VIN)، مسح الباركود، وإصدار الفواتير فورياً</p>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-success d-flex align-items-center gap-1">
            <i className="bi bi-broadcast"></i> كاشير نقطة البيع متصل
          </span>
        </div>
      </div>

      <div className="row g-3">
        {/* Left: Product Catalog & Fast Buttons */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body p-3">
              <div className="row g-2 align-items-center">
                <div className="col-md-3">
                  <label className="form-label small fw-bold mb-1">الفرع</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      setSelectedWarehouseId('');
                    }}
                  >
                    {(branchesData || []).map((b: any) => (
                      <option key={b.id} value={b.id}>{b.nameAr || b.nameEn} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-bold mb-1">مخزن الصرف</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  >
                    {(warehousesData || []).map((w: any) => (
                      <option key={w.id} value={w.id}>{w.nameAr || w.nameEn}</option>
                    ))}
                  </select>
                </div>

                {/* Customer Section with Search & Quick Add */}
                <div className="col-md-6">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-bold mb-0">العميل / المشتري</label>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-primary py-0 px-2 small d-flex align-items-center gap-1"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setShowAddCustomerModal(true)}
                    >
                      <i className="bi bi-person-plus-fill"></i> + إضافة عميل جديد
                    </button>
                  </div>

                  <div className="d-flex gap-1">
                    <div className="flex-grow-1 position-relative">
                      <select
                        className="form-select form-select-sm"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                      >
                        {filteredCustomers.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.nameAr || c.nameEn} {c.phone ? `(${c.phone})` : ''} - {c.priceTier === 'B2B' ? 'شركات' : 'قطاعي'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Customer Quick Search Input */}
                  <div className="input-group input-group-sm mt-1">
                    <span className="input-group-text bg-light border-end-0 py-0" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control form-control-sm border-start-0 py-0"
                      style={{ fontSize: '0.75rem' }}
                      placeholder="بحث سريع باسم العميل أو رقم الهاتف..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    />
                    {customerSearchQuery && (
                      <button
                        className="btn btn-outline-secondary py-0 px-2"
                        type="button"
                        onClick={() => setCustomerSearchQuery('')}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {selectedCustomer && (
                <div className="alert alert-light border small mt-2 mb-0 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fw-bold">{selectedCustomer.nameAr || selectedCustomer.nameEn}</span>
                    {selectedCustomer.phone && <span className="text-muted ms-2">هاتف: {selectedCustomer.phone}</span>}
                    <span className="badge bg-secondary-subtle text-secondary ms-2">
                      {selectedCustomer.priceTier === 'B2B' ? 'أسعار شركات (B2B)' : 'سعر قطاعي'}
                    </span>
                    <span className="ms-3">حد الائتمان: {selectedCustomer.creditLimit?.toLocaleString()} ج.م</span>
                  </div>
                  <div>
                    <span>الرصيد الحالي: </span>
                    <span className={`fw-bold ${selectedCustomer.currentBalance > 0 ? 'text-danger' : 'text-success'}`}>
                      {selectedCustomer.currentBalance?.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product & Barcode Search Bar */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body p-2">
              <div className="row g-2">
                <div className="col-md-7">
                  <form onSubmit={handleBarcodeSubmit} className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-upc-scan text-primary fs-6"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="مسح الباركود، الكود (SKU)، أو رقم الشاسيه (VIN)..."
                      value={barcodeSearch}
                      onChange={(e) => setBarcodeSearch(e.target.value)}
                    />
                    <button className="btn btn-primary" type="submit">
                      إضافة للسلة
                    </button>
                  </form>
                </div>
                <div className="col-md-5">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-funnel text-secondary"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="تصفية الكتالوج بالاسم..."
                      value={productCatalogSearch}
                      onChange={(e) => setProductCatalogSearch(e.target.value)}
                    />
                    {productCatalogSearch && (
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setProductCatalogSearch('')}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Vehicles Section */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
              <span className="fw-bold small text-uppercase">
                <i className="bi bi-bicycle me-1 text-primary"></i> دراجات ومركبات المعرض المتاحة ({filteredVehicles?.length || 0})
              </span>
              {productCatalogSearch && (
                <span className="badge bg-info-subtle text-info small">تصفية البحث مفعلة</span>
              )}
            </div>
            <div className="card-body p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {!selectedWarehouseId ? (
                <div className="text-muted small text-center p-3">اختر مخزن الصرف أعلاه لعرض المركبات</div>
              ) : filteredVehicles?.length === 0 ? (
                <div className="text-muted small text-center p-3">لا توجد مركبات مطابقة في هذا المخزن</div>
              ) : (
                <div className="row g-2">
                  {filteredVehicles?.map((v: any) => (
                    <div key={v.id} className="col-md-6">
                      <div
                        className="p-2 border rounded hover-bg-light cursor-pointer d-flex justify-content-between align-items-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => addToCart(v.product, v)}
                      >
                        <div>
                          <div className="fw-bold small">{v.product?.nameAr || v.product?.nameEn}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            شاسيه: <span className="font-monospace fw-semibold">{v.vin}</span> | {v.color}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold text-primary small">
                            {(selectedCustomer?.priceTier === 'B2B' && v.b2bPrice > 0 ? v.b2bPrice : v.sellingPrice)?.toLocaleString()} ج.م
                          </div>
                          <span className="badge bg-success-subtle text-success border border-success" style={{ fontSize: '0.65rem' }}>
                            + اختيار الشاسيه
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Spare Parts & Catalog Items */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
              <span className="fw-bold small text-uppercase">
                <i className="bi bi-box-seam me-1 text-primary"></i> قطع الغيار والزيوت والإكسسوارات ({filteredCatalogProducts.length})
              </span>
            </div>
            <div className="card-body p-2" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {filteredCatalogProducts.length === 0 ? (
                <div className="text-muted small text-center p-3">لا توجد أصناف مطابقة للبحث</div>
              ) : (
                <div className="row g-2">
                  {filteredCatalogProducts.slice(0, 24).map((p: any) => (
                    <div key={p.id} className="col-md-4">
                      <button
                        className="btn btn-outline-secondary btn-sm w-100 text-start p-2 d-flex flex-column justify-content-between"
                        style={{ height: '70px' }}
                        onClick={() => addToCart(p)}
                      >
                        <div className="fw-bold text-truncate" style={{ maxWidth: '100%' }}>{p.nameAr || p.nameEn}</div>
                        <div className="d-flex justify-content-between w-100 small text-muted">
                          <span>{p.sku}</span>
                          <span className="text-primary fw-bold">
                            {(selectedCustomer?.priceTier === 'B2B' && p.b2bPrice > 0 ? p.b2bPrice : p.retailPrice)?.toLocaleString()} ج.م
                          </span>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sales Ticket / Cart */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100 d-flex flex-column">
            <div className="card-header bg-primary text-white py-2 d-flex justify-content-between align-items-center">
              <span className="fw-bold">
                <i className="bi bi-cart3 me-1"></i> فاتورة البيع الحالية
              </span>
              <span className="badge bg-light text-dark font-monospace">{cart.length} أصناف</span>
            </div>

            <div className="card-body p-2 flex-grow-1 overflow-auto" style={{ maxHeight: '420px' }}>
              {cart.length === 0 ? (
                <div className="text-center text-muted p-5">
                  <i className="bi bi-cart-x fs-1 d-block mb-2"></i>
                  <span>السلة فارغة. قم بمسح الباركود أو اختيار الصنف لإضافته.</span>
                </div>
              ) : (
                <table className="table table-sm align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>الصنف</th>
                      <th style={{ width: '85px' }} className="text-center">الكمية</th>
                      <th style={{ width: '90px' }} className="text-end">السعر</th>
                      <th style={{ width: '90px' }} className="text-end">الإجمالي</th>
                      <th style={{ width: '35px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <div className="fw-semibold">{item.name}</div>
                          <div className="text-muted font-monospace" style={{ fontSize: '0.7rem' }}>
                            {item.sku} {item.isVehicle && <span className="badge bg-primary text-white ms-1">شاسيه</span>}
                          </div>
                        </td>
                        <td>
                          {item.isVehicle ? (
                            <span className="badge bg-light text-dark border d-block text-center py-1">1</span>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              className="form-control form-control-sm text-center p-1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, Number(e.target.value))}
                            />
                          )}
                        </td>
                        <td className="text-end">
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm text-end p-1"
                            value={item.unitPrice}
                            onChange={(e) => updatePrice(index, Number(e.target.value))}
                          />
                        </td>
                        <td className="text-end fw-bold">
                          {(item.unitPrice * item.quantity).toLocaleString()} ج.م
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-link text-danger p-0"
                            onClick={() => removeFromCart(index)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Ticket Totals & Payment */}
            <div className="card-footer bg-white border-top p-3">
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small mb-0 fw-semibold">نوع الفاتورة</label>
                  <select
                    className="form-select form-select-sm"
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                  >
                    <option value="CASH">نقدي (سداد فوري كامل)</option>
                    <option value="CREDIT">آجل / تقسيط</option>
                    <option value="B2B">بيع شركات (B2B)</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small mb-0 fw-semibold">طريقة السداد</label>
                  <select
                    className="form-select form-select-sm"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">كاش نقدية</option>
                    <option value="POS_CARD">فيزا / ماستركارد</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CHEQUE">شيك بنكي</option>
                  </select>
                </div>
              </div>

              {invoiceType !== 'CASH' && (
                <div className="mb-2">
                  <label className="form-label small mb-0 fw-semibold">المبلغ المدفوع كدفعة مقدمة (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    className="form-control form-control-sm"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                  />
                </div>
              )}

              {/* Discount & Tax Options */}
              <div className="p-2 mb-2 bg-light rounded border">
                <div className="row g-2 align-items-center mb-1">
                  <div className="col-6">
                    <label className="form-label small mb-0 fw-semibold text-danger">
                      <i className="bi bi-tag-fill me-1"></i> قيمة الخصم (ج.م):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      className="form-control form-control-sm text-danger fw-bold"
                      placeholder="0"
                      value={discountTotal || ''}
                      onChange={(e) => setDiscountTotal(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small mb-0 fw-semibold text-primary">
                      <i className="bi bi-percent me-1"></i> احتساب الضريبة:
                    </label>
                    <div className="form-check form-switch mt-1">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="taxToggle"
                        checked={isTaxEnabled}
                        onChange={(e) => setIsTaxEnabled(e.target.checked)}
                      />
                      <label className="form-check-label small fw-semibold" htmlFor="taxToggle">
                        {isTaxEnabled ? `خاضع للضريبة (${taxRatePercent}%)` : 'بدون ضريبة (معفى)'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-between small text-muted mb-1">
                <span>المجموع قبل الخصم:</span>
                <span>{subtotal.toLocaleString()} ج.م</span>
              </div>
              {discountTotal > 0 && (
                <div className="d-flex justify-content-between small text-danger fw-semibold mb-1">
                  <span>الخصم المطبق:</span>
                  <span>- {discountTotal.toLocaleString()} ج.م</span>
                </div>
              )}
              {isTaxEnabled ? (
                <div className="d-flex justify-content-between small text-muted mb-2">
                  <span>ضريبة القيمة المضافة ({taxRatePercent}%):</span>
                  <span>+ {taxAmount.toLocaleString()} ج.م</span>
                </div>
              ) : (
                <div className="d-flex justify-content-between small text-secondary mb-2">
                  <span>الضريبة:</span>
                  <span className="badge bg-secondary-subtle text-secondary">معفى من الضريبة (0%)</span>
                </div>
              )}
              <div className="d-flex justify-content-between fs-5 fw-bold text-dark border-top pt-2 mb-3">
                <span>الإجمالي النهائي المطلوب:</span>
                <span className="text-primary">{grandTotal.toLocaleString()} ج.م</span>
              </div>

              <button
                className="btn btn-success btn-lg w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                disabled={cart.length === 0 || checkoutMutation.isPending}
                onClick={handleCheckout}
              >
                <i className="bi bi-printer-fill"></i>
                <span>{checkoutMutation.isPending ? 'جاري التنفيذ...' : 'تحصيل وطباعة الفاتورة'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleQuickAddCustomer}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-person-plus-fill me-2"></i> إضافة عميل جديد سريعاً
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowAddCustomerModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-3">
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-bold mb-1">اسم العميل بالكامل *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="أدخل اسم العميل (عربي أو إنجليزي)"
                        required
                        value={newCustomerForm.nameAr}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, nameAr: e.target.value, nameEn: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold mb-1">رقم الهاتف / الموبايل *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="01xxxxxxxxx"
                        required
                        value={newCustomerForm.phone}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold mb-1">فئة السعر</label>
                      <select
                        className="form-select form-select-sm"
                        value={newCustomerForm.priceTier}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, priceTier: e.target.value })}
                      >
                        <option value="RETAIL">قطاعي (Retail)</option>
                        <option value="B2B">شركات (B2B)</option>
                        <option value="VIP">خاص / VIP</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold mb-1">نوع العميل</label>
                      <select
                        className="form-select form-select-sm"
                        value={newCustomerForm.type}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, type: e.target.value })}
                      >
                        <option value="INDIVIDUAL">فرد</option>
                        <option value="COMPANY">شركة / تاجر</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold mb-1">الرقم القومي (اختياري)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="14 رقم"
                        value={newCustomerForm.nationalId}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, nationalId: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold mb-1">العنوان / المدينة (اختياري)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="مثال: القاهرة - المعادي"
                        value={newCustomerForm.address}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer p-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowAddCustomerModal(false)}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary fw-bold"
                    disabled={addCustomerMutation.isPending}
                  >
                    {addCustomerMutation.isPending ? 'جاري الحفظ...' : 'حفظ واختيار العميل فوراً'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Print & Confirmation Modal */}
      {completedInvoice && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-check-circle-fill me-2"></i> تم إصدار الفاتورة بنجاح!
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setCompletedInvoice(null)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                <div className="font-monospace fs-4 fw-bold text-primary mb-2">
                  {completedInvoice.invoiceNo}
                </div>
                <p className="text-muted small">
                  العميل: <strong>{completedInvoice.customer?.nameAr || completedInvoice.customer?.nameEn}</strong> | التاريخ: {new Date(completedInvoice.createdAt).toLocaleString('ar-EG')}
                </p>

                <div className="p-3 bg-light rounded text-start mb-3 font-monospace small">
                  <div className="d-flex justify-content-between mb-1">
                    <span>المجموع قبل الخصم:</span>
                    <span>{completedInvoice.subtotal?.toLocaleString()} ج.م</span>
                  </div>
                  {completedInvoice.discountTotal > 0 && (
                    <div className="d-flex justify-content-between text-danger mb-1">
                      <span>الخصم المطبق:</span>
                      <span>- {completedInvoice.discountTotal?.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between text-muted mb-1">
                    <span>ضريبة القيمة المضافة ({completedInvoice.taxRate || 0}%):</span>
                    <span>{completedInvoice.taxAmount > 0 ? `+ ${completedInvoice.taxAmount?.toLocaleString()} ج.م` : '0 ج.م (معفى)'}</span>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-1 mt-1 fs-6 fw-bold text-dark">
                    <span>إجمالي الفاتورة:</span>
                    <span className="text-primary">{completedInvoice.grandTotal?.toLocaleString()} ج.م</span>
                  </div>
                  <div className="d-flex justify-content-between text-success mt-1">
                    <span>المدفوع:</span>
                    <span>{completedInvoice.paidAmount?.toLocaleString()} ج.م</span>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-1 mt-1 fw-bold">
                    <span>المتبقي:</span>
                    <span className={completedInvoice.balanceDue > 0 ? 'text-danger' : 'text-muted'}>
                      {completedInvoice.balanceDue?.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                <div className="alert alert-info small py-2 mb-0">
                  <i className="bi bi-info-circle me-1"></i> تم خصم الأصناف من المخزن وتسجيل ضمانات وبيانات نقل الملكية آلياً.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => window.print()}>
                  <i className="bi bi-printer me-1"></i> طباعة الفاتورة (A4 / إيصال كاشير)
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setCompletedInvoice(null)}>
                  فاتورة جديدة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
