import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function WarehousesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [form, setForm] = useState({
    branchId: '',
    code: '',
    nameEn: '',
    nameAr: '',
    type: 'MAIN',
    address: '',
  });

  const { data: warehousesData, isLoading, error, refetch } = useQuery({
    queryKey: ['warehouses-list', branchFilter, search],
    queryFn: async () => {
      const res: any = await apiClient.get('/warehouses', {
        params: {
          limit: 100,
          branchId: branchFilter || undefined,
          search: search || undefined
        }
      });
      return res;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches-select-wh'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches?limit=100');
      return (res as any)?.data || res;
    },
  });

  const resetForm = () => {
    setForm({
      branchId: '',
      code: '',
      nameEn: '',
      nameAr: '',
      type: 'MAIN',
      address: '',
    });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/warehouses', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses-list'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses-select'] });
      toast.success('Warehouse created successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to create warehouse');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/warehouses/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses-list'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses-select'] });
      toast.success('Warehouse updated successfully');
      setEditingWarehouse(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update warehouse');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/warehouses/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses-list'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses-select'] });
      toast.success('Warehouse deleted successfully');
      setWarehouseToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to delete warehouse');
    },
  });

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (wh: any) => {
    setForm({
      branchId: wh.branchId,
      code: wh.code,
      nameEn: wh.nameEn,
      nameAr: wh.nameAr || '',
      type: wh.type || 'MAIN',
      address: wh.address || '',
    });
    setEditingWarehouse(wh);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      address: form.address ? form.address : null,
    };

    if (editingWarehouse) {
      updateMutation.mutate({ id: editingWarehouse.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rawWarehouses = warehousesData?.data || [];
  const warehouses = rawWarehouses.filter((w: any) => {
    if (typeFilter) return w.type === typeFilter;
    return true;
  });
  const branches = branchesData || [];

  return (
    <div className="animate-fade-in vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-box-seam-fill me-2 text-success"></i>
            إدارة المستودعات والمخازن (Warehouses)
          </h3>
          <p className="text-muted small mb-0">إدارة المستودعات والمواقع التخزينية وربطها بالفروع</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-clockwise me-1"></i> تحديث
          </button>
          {hasPermission('warehouses.create') && (
            <button className="btn btn-success btn-sm" onClick={handleOpenAdd}>
              <i className="bi bi-plus-lg me-1"></i> إضافة مخزن جديد
            </button>
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="بحث باسم المخزن أو الكود..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select form-select-sm"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">جميع الفروع</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr || b.nameEn} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">جميع أنواع المخازن</option>
                <option value="MAIN">رئيسي (Main)</option>
                <option value="SECONDARY">فرعي (Secondary)</option>
                <option value="TRANSIT">بضاعة بالطريق (Transit)</option>
                <option value="SERVICE">صيانة (Service)</option>
                <option value="RETURNS">مرتجعات (Returns)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status"></div>
          <p className="mt-2 text-muted">Loading warehouses...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> Failed to load warehouses.
        </div>
      ) : (
        <div className="erp-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Warehouse Name (EN)</th>
                  <th>Warehouse Name (AR)</th>
                  <th>Branch</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses && warehouses.length > 0 ? (
                  warehouses.map((wh: any) => (
                    <tr key={wh.id}>
                      <td>
                        <span className="badge bg-dark font-monospace">{wh.code}</span>
                      </td>
                      <td className="fw-semibold">{wh.nameEn}</td>
                      <td dir="rtl">{wh.nameAr}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <i className="bi bi-building me-1"></i>
                          {wh.branch?.nameEn || wh.branchId}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{wh.type}</span>
                      </td>
                      <td>
                        {wh.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Inactive</span>
                        )}
                      </td>
                      <td className="text-muted small">
                        {new Date(wh.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {hasPermission('warehouses.update') && (
                            <button
                              className="btn btn-outline-primary"
                              title="تعديل المخزن"
                              onClick={() => handleOpenEdit(wh)}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                          )}
                          {hasPermission('warehouses.delete') && (
                            <button
                              className="btn btn-outline-danger"
                              title="حذف المخزن"
                              onClick={() => setWarehouseToDelete(wh)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      No warehouses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Warehouse Modal */}
      {(showAddModal || editingWarehouse) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-box-seam me-2 text-success"></i>
                    {editingWarehouse ? `Edit Warehouse: ${editingWarehouse.nameEn}` : 'Add New Warehouse'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingWarehouse(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Branch Location *</label>
                      <select
                        className="form-select"
                        required
                        value={form.branchId}
                        disabled={!!editingWarehouse}
                        onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      >
                        <option value="">Select Branch...</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.nameEn} ({b.nameAr}) - {b.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Warehouse Code *</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. WH-MAIN-01"
                        required
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Type *</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        <option value="MAIN">MAIN (مستودع رئيسي)</option>
                        <option value="SECONDARY">SECONDARY (مستودع فرعي)</option>
                        <option value="TRANSIT">TRANSIT (بضاعة بالطريق)</option>
                        <option value="SERVICE">SERVICE (مستودع صيانة)</option>
                        <option value="RETURNS">RETURNS (مردودات)</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">English Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Main Parts & Showroom Depot"
                        required
                        value={form.nameEn}
                        onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Arabic Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="مثال: المستودع الرئيسي لقطع الغيار والمعرض"
                        dir="rtl"
                        required
                        value={form.nameAr}
                        onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Address / Rack Area</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Location inside branch or address..."
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingWarehouse(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingWarehouse ? 'Save Changes' : 'Create Warehouse'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {warehouseToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i> Confirm Delete Warehouse
                </h5>
                <button type="button" className="btn-close" onClick={() => setWarehouseToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete warehouse <strong>"{warehouseToDelete.nameEn}"</strong> ({warehouseToDelete.code})?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bi bi-info-circle me-1"></i> Make sure no active inventory balances or movements exist in this warehouse.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setWarehouseToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(warehouseToDelete.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Warehouse'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
