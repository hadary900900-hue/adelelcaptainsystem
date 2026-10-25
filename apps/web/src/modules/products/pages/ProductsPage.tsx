import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Can view cost price? Only admin or users with settings/audit/admin privileges
  const canViewCostPrice = hasPermission('admin.all') || hasPermission('settings.view');

  // Form state
  const [form, setForm] = useState({
    sku: '',
    barcode: '',
    nameEn: '',
    nameAr: '',
    type: 'SPARE_PART',
    categoryId: '',
    brandId: '',
    unitOfMeasure: 'PCS',
    costPrice: 0,
    retailPrice: 0,
    b2bPrice: 0,
    minStockAlert: 0,
    allowNegativeStock: false,
    oemNumber: '',
    compatibleModels: '',
    supplierName: '',
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', search, typeFilter],
    queryFn: async () => {
      const res = await apiClient.get('/products', {
        params: { search: search || undefined, type: typeFilter || undefined, limit: 50 },
      });
      return res;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-select'],
    queryFn: async () => {
      const res = await apiClient.get('/categories', { params: { limit: 100 } });
      return (res as any)?.data || res;
    },
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands-select'],
    queryFn: async () => {
      const res = await apiClient.get('/brands', { params: { limit: 100 } });
      return (res as any)?.data || res;
    },
  });

  const resetForm = () => {
    setForm({
      sku: '',
      barcode: '',
      nameEn: '',
      nameAr: '',
      type: 'SPARE_PART',
      categoryId: '',
      brandId: '',
      unitOfMeasure: 'PCS',
      costPrice: 0,
      retailPrice: 0,
      b2bPrice: 0,
      minStockAlert: 0,
      allowNegativeStock: false,
      oemNumber: '',
      compatibleModels: '',
      supplierName: '',
    });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/products', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to create product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/products/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
      setEditingProduct(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/products/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      setProductToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to delete product');
    },
  });

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: any) => {
    setForm({
      sku: p.sku,
      barcode: p.barcode || '',
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      type: p.type,
      categoryId: p.categoryId || '',
      brandId: p.brandId || '',
      unitOfMeasure: p.unitOfMeasure || 'PCS',
      costPrice: p.costPrice || 0,
      retailPrice: p.retailPrice || 0,
      b2bPrice: p.b2bPrice || 0,
      minStockAlert: p.minStockAlert || 0,
      allowNegativeStock: !!p.allowNegativeStock,
      oemNumber: p.sparePartInfo?.oemNumber || '',
      compatibleModels: p.sparePartInfo?.compatibleModels || '',
      supplierName: p.sparePartInfo?.supplierName || '',
    });
    setEditingProduct(p);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      costPrice: Number(form.costPrice),
      retailPrice: Number(form.retailPrice),
      b2bPrice: Number(form.b2bPrice),
      minStockAlert: Number(form.minStockAlert),
      categoryId: form.categoryId || null,
      brandId: form.brandId || null,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const products = productsData?.data || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Product Master Catalog</h3>
          <p className="text-muted mb-0">Central entity for vehicles, spare parts, oils, and accessories</p>
        </div>
        {hasPermission('products.create') && (
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg"></i>
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by SKU, Barcode, or Product Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All Product Types</option>
                <option value="VEHICLE">Vehicles (دراجات وسكوترات)</option>
                <option value="SPARE_PART">Spare Parts (قطع غيار)</option>
                <option value="ACCESSORY">Accessories (إكسسوارات)</option>
                <option value="OIL">Oils & Lubricants (زيوت)</option>
                <option value="CONSUMABLE">Consumables (مستهلكات)</option>
                <option value="SERVICE">Services (خدمات صيانة)</option>
              </select>
            </div>
            <div className="col-md-3 text-end d-flex align-items-center justify-content-end">
              <span className="badge bg-secondary px-3 py-2 fs-6">Total: {products.length} Products</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading product catalog...</div>
            </div>
          ) : products.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-box-seam display-4 mb-3 text-secondary d-block"></i>
              <h5>No products registered yet</h5>
              <p>Add your first vehicle model, spare part, or oil consumable to get started.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>SKU / Barcode</th>
                    <th>Product Name</th>
                    <th>Type</th>
                    <th>Brand / Category</th>
                    <th>Pricing</th>
                    <th>Stock Total</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: any) => {
                    const totalStock = (p.stockBalances || []).reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="fw-bold">{p.sku}</div>
                          {p.barcode && <span className="small text-muted font-monospace">{p.barcode}</span>}
                        </td>
                        <td>
                          <div className="fw-semibold">{p.nameEn}</div>
                          <div className="small text-muted" dir="rtl">{p.nameAr}</div>
                        </td>
                        <td>
                          <span className={`badge ${
                            p.type === 'VEHICLE' ? 'bg-primary' :
                            p.type === 'SPARE_PART' ? 'bg-info text-dark' :
                            p.type === 'OIL' ? 'bg-warning text-dark' : 'bg-secondary'
                          }`}>
                            {p.type}
                          </span>
                        </td>
                        <td>
                          <div>{p.brand?.nameEn || '—'}</div>
                          <small className="text-muted">{p.category?.nameEn || '—'}</small>
                        </td>
                        <td>
                          <div>{p.retailPrice.toLocaleString()} {p.organization?.baseCurrency || 'EGP'}</div>
                          {canViewCostPrice ? (
                            <small className="text-danger fw-semibold">
                              <i className="bi bi-shield-lock me-1"></i>Cost: {p.costPrice.toLocaleString()} EGP
                            </small>
                          ) : (
                            <small className="text-muted fst-italic">B2B: {p.b2bPrice.toLocaleString()} EGP</small>
                          )}
                        </td>
                        <td>
                          <span className={`fw-bold ${totalStock <= (p.minStockAlert || 0) ? 'text-danger' : 'text-success'}`}>
                            {totalStock} {p.unitOfMeasure}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${p.isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              title="Details"
                              onClick={() => setSelectedProduct(p)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            {hasPermission('products.update') && (
                              <button
                                className="btn btn-outline-primary"
                                title="Edit Product"
                                onClick={() => handleOpenEdit(p)}
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                            )}
                            {hasPermission('products.delete') && (
                              <button
                                className="btn btn-outline-danger"
                                title="Delete Product"
                                onClick={() => setProductToDelete(p)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{selectedProduct.nameEn} ({selectedProduct.sku})</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedProduct(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="text-muted small">Arabic Name</label>
                    <div className="fw-semibold" dir="rtl">{selectedProduct.nameAr}</div>
                  </div>
                  <div className="col-md-3">
                    <label className="text-muted small">Type</label>
                    <div className="fw-semibold">{selectedProduct.type}</div>
                  </div>
                  <div className="col-md-3">
                    <label className="text-muted small">Barcode</label>
                    <div className="fw-semibold font-monospace">{selectedProduct.barcode || '—'}</div>
                  </div>

                  {canViewCostPrice && (
                    <div className="col-md-4">
                      <label className="text-muted small">Cost Price (Admin Only)</label>
                      <div className="fw-semibold text-danger">
                        <i className="bi bi-shield-lock me-1"></i>{selectedProduct.costPrice} EGP
                      </div>
                    </div>
                  )}
                  <div className={canViewCostPrice ? 'col-md-4' : 'col-md-6'}>
                    <label className="text-muted small">Retail Price</label>
                    <div className="fw-semibold text-success">{selectedProduct.retailPrice} EGP</div>
                  </div>
                  <div className={canViewCostPrice ? 'col-md-4' : 'col-md-6'}>
                    <label className="text-muted small">B2B Wholesale Price</label>
                    <div className="fw-semibold text-primary">{selectedProduct.b2bPrice} EGP</div>
                  </div>

                  {/* Stock balances across warehouses */}
                  <div className="col-12 mt-4">
                    <h6 className="fw-bold border-bottom pb-2">Stock Balances by Warehouse</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead>
                          <tr className="table-light">
                            <th>Warehouse</th>
                            <th>Total Quantity</th>
                            <th>Reserved Qty</th>
                            <th>Available Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedProduct.stockBalances || []).map((sb: any) => (
                            <tr key={sb.id}>
                              <td>{sb.warehouse?.nameEn}</td>
                              <td className="fw-bold">{sb.quantity}</td>
                              <td>{sb.reservedQty}</td>
                              <td className="text-success fw-bold">{sb.availableQty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selectedProduct.sparePartInfo && (
                    <div className="col-12 mt-2">
                      <h6 className="fw-bold border-bottom pb-2">Spare Part Specs</h6>
                      <p className="mb-1"><strong>OEM Number:</strong> {selectedProduct.sparePartInfo.oemNumber || '—'}</p>
                      <p className="mb-1"><strong>Compatible Models:</strong> {selectedProduct.sparePartInfo.compatibleModels || '—'}</p>
                      <p className="mb-1"><strong>Warranty:</strong> {selectedProduct.sparePartInfo.warrantyMonths} Months</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedProduct(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingProduct ? `Edit Product: ${editingProduct.nameEn}` : 'Create New Product'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingProduct(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">SKU *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="e.g. PART-BRK-001"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Barcode</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.barcode}
                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                        placeholder="e.g. 6221000..."
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Type *</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        <option value="SPARE_PART">Spare Part</option>
                        <option value="VEHICLE">Vehicle Unit</option>
                        <option value="ACCESSORY">Accessory</option>
                        <option value="OIL">Oil & Lubricant</option>
                        <option value="CONSUMABLE">Consumable</option>
                        <option value="SERVICE">Service</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">English Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.nameEn}
                        onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Arabic Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        dir="rtl"
                        required
                        value={form.nameAr}
                        onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Brand</label>
                      <select
                        className="form-select"
                        value={form.brandId}
                        onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                      >
                        <option value="">Select Brand...</option>
                        {(brandsData || []).map((b: any) => (
                          <option key={b.id} value={b.id}>{b.nameEn} ({b.nameAr})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={form.categoryId}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      >
                        <option value="">Select Category...</option>
                        {(categoriesData || []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.nameEn} ({c.nameAr})</option>
                        ))}
                      </select>
                    </div>

                    {/* Pricing */}
                    {canViewCostPrice && (
                      <div className="col-md-4">
                        <label className="form-label">Cost Price (EGP) <span className="badge bg-danger-subtle text-danger">Admin Only</span></label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.costPrice}
                          onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                        />
                      </div>
                    )}
                    <div className={canViewCostPrice ? 'col-md-4' : 'col-md-6'}>
                      <label className="form-label">Retail Price (EGP)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.retailPrice}
                        onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div className={canViewCostPrice ? 'col-md-4' : 'col-md-6'}>
                      <label className="form-label">B2B Wholesale (EGP)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.b2bPrice}
                        onChange={(e) => setForm({ ...form, b2bPrice: Number(e.target.value) })}
                      />
                    </div>

                    {form.type === 'SPARE_PART' && (
                      <>
                        <div className="col-md-6">
                          <label className="form-label">OEM Part Number</label>
                          <input
                            type="text"
                            className="form-control"
                            value={form.oemNumber}
                            onChange={(e) => setForm({ ...form, oemNumber: e.target.value })}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Compatible Vehicle Models</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. SYM Jet 4, Honda CG125"
                            value={form.compatibleModels}
                            onChange={(e) => setForm({ ...form, compatibleModels: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingProduct(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingProduct ? 'Save Changes' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Modal */}
      {productToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-trash me-2"></i> Confirm Delete Product
                </h5>
                <button type="button" className="btn-close" onClick={() => setProductToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete product <strong>"{productToDelete.nameEn}"</strong> ({productToDelete.sku})?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bi bi-info-circle me-1"></i> Products with existing stock movements or vehicle units cannot be deleted.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProductToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(productToDelete.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
