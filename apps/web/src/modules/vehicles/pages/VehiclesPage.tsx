import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function VehiclesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);

  // Can view purchase cost? Only admin or settings privilege
  const canViewCostPrice = hasPermission('admin.all') || hasPermission('settings.view');

  const [form, setForm] = useState({
    productId: '',
    branchId: '',
    warehouseId: '',
    vin: '',
    engineNumber: '',
    color: '',
    modelYear: 2024,
    status: 'AVAILABLE',
    purchaseCost: 0,
    sellingPrice: 0,
    b2bPrice: 0,
    keyNumber: '',
    batteryNumber: '',
    notes: '',
  });

  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['vehicles', search, statusFilter],
    queryFn: async () => {
      const res = await apiClient.get('/vehicles', {
        params: { search: search || undefined, status: statusFilter || undefined, limit: 50 },
      });
      return res;
    },
  });

  const { data: vehicleProducts } = useQuery({
    queryKey: ['products-vehicle-type'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { type: 'VEHICLE', limit: 100 } });
      return (res as any)?.data || res;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await apiClient.get('/branches', { params: { limit: 100 } });
      return (res as any)?.data || res;
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses', { params: { limit: 100 } });
      return (res as any)?.data || res;
    },
  });

  const resetForm = () => {
    setForm({
      productId: '',
      branchId: '',
      warehouseId: '',
      vin: '',
      engineNumber: '',
      color: '',
      modelYear: 2024,
      status: 'AVAILABLE',
      purchaseCost: 0,
      sellingPrice: 0,
      b2bPrice: 0,
      keyNumber: '',
      batteryNumber: '',
      notes: '',
    });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/vehicles', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      toast.success('Vehicle unit registered and inventoried successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to register vehicle');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/vehicles/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle unit updated successfully');
      setEditingVehicle(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update vehicle');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/vehicles/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      toast.success('Vehicle unit deleted successfully');
      setVehicleToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to delete vehicle');
    },
  });

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (v: any) => {
    setForm({
      productId: v.productId,
      branchId: v.branchId,
      warehouseId: v.warehouseId,
      vin: v.vin,
      engineNumber: v.engineNumber,
      color: v.color || '',
      modelYear: v.modelYear || 2024,
      status: v.status || 'AVAILABLE',
      purchaseCost: v.purchaseCost || 0,
      sellingPrice: v.sellingPrice || 0,
      b2bPrice: v.b2bPrice || 0,
      keyNumber: v.keyNumber || '',
      batteryNumber: v.batteryNumber || '',
      notes: v.notes || '',
    });
    setEditingVehicle(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      modelYear: Number(form.modelYear),
      purchaseCost: Number(form.purchaseCost),
      sellingPrice: Number(form.sellingPrice),
      b2bPrice: Number(form.b2bPrice),
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const vehicles = vehiclesData?.data || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Vehicle Unit Registry (Track by Chassis/VIN)</h3>
          <p className="text-muted mb-0">Track each motorcycle & scooter individually with VIN, Engine number, and location</p>
        </div>
        {hasPermission('vehicles.create') && (
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg"></i>
            <span>Register Vehicle Unit</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="Search by VIN / Chassis, Engine #, or Model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="SOLD">Sold</option>
                <option value="IN_SERVICE">In Service</option>
                <option value="DAMAGED">Damaged</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>
            <div className="col-md-3 text-end d-flex align-items-center justify-content-end">
              <span className="badge bg-secondary px-3 py-2 fs-6">Total: {vehicles.length} Units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading vehicles inventory...</div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-bicycle display-4 mb-3 text-secondary d-block"></i>
              <h5>No vehicle units found</h5>
              <p>Register vehicle units with their unique VIN and Engine number.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>VIN / Chassis</th>
                    <th>Engine Number</th>
                    <th>Model & Product</th>
                    <th>Color / Year</th>
                    <th>Branch / Warehouse</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v: any) => (
                    <tr key={v.id}>
                      <td>
                        <span className="fw-bold font-monospace text-primary">{v.vin}</span>
                      </td>
                      <td>
                        <span className="font-monospace text-dark">{v.engineNumber}</span>
                      </td>
                      <td>
                        <div className="fw-semibold">{v.product?.nameEn}</div>
                        <small className="text-muted">{v.product?.brand?.nameEn}</small>
                      </td>
                      <td>
                        <div>{v.color}</div>
                        <small className="text-muted">{v.modelYear}</small>
                      </td>
                      <td>
                        <div>{v.branch?.nameEn}</div>
                        <small className="text-muted">{v.warehouse?.nameEn}</small>
                      </td>
                      <td>
                        <div className="fw-semibold">{v.sellingPrice.toLocaleString()} EGP</div>
                        {canViewCostPrice ? (
                          <small className="text-danger">
                            <i className="bi bi-shield-lock me-1"></i>Cost: {v.purchaseCost.toLocaleString()} EGP
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <span className={`badge ${
                          v.status === 'AVAILABLE' ? 'bg-success' :
                          v.status === 'RESERVED' ? 'bg-warning text-dark' :
                          v.status === 'SOLD' ? 'bg-secondary' : 'bg-info'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {hasPermission('vehicles.update') && (
                            <button
                              className="btn btn-outline-primary"
                              title="Edit Vehicle"
                              onClick={() => handleOpenEdit(v)}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                          )}
                          {hasPermission('vehicles.delete') && v.status !== 'SOLD' && (
                            <button
                              className="btn btn-outline-danger"
                              title="Delete Vehicle"
                              onClick={() => setVehicleToDelete(v)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
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

      {/* Add / Edit Vehicle Modal */}
      {(showAddModal || editingVehicle) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingVehicle ? `Edit Vehicle Unit: ${editingVehicle.vin}` : 'Register Vehicle Unit'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingVehicle(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Vehicle Product *</label>
                      <select
                        className="form-select"
                        required
                        disabled={!!editingVehicle}
                        value={form.productId}
                        onChange={(e) => setForm({ ...form, productId: e.target.value })}
                      >
                        <option value="">Select Vehicle Catalog Product...</option>
                        {(vehicleProducts || []).map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.nameEn} ({p.sku}) - {p.brand?.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Branch *</label>
                      <select
                        className="form-select"
                        required
                        disabled={!!editingVehicle}
                        value={form.branchId}
                        onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      >
                        <option value="">Select Branch...</option>
                        {(branchesData || []).map((b: any) => (
                          <option key={b.id} value={b.id}>{b.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Warehouse *</label>
                      <select
                        className="form-select"
                        required
                        disabled={!!editingVehicle}
                        value={form.warehouseId}
                        onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                      >
                        <option value="">Select Warehouse...</option>
                        {(warehousesData || []).map((w: any) => (
                          <option key={w.id} value={w.id}>{w.nameEn}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Chassis / VIN *</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="17-digit VIN / Chassis #"
                        required
                        value={form.vin}
                        onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Engine Number *</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="Engine block serial #"
                        required
                        value={form.engineNumber}
                        onChange={(e) => setForm({ ...form, engineNumber: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Color</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Matte Black / Red"
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Model Year</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.modelYear}
                        onChange={(e) => setForm({ ...form, modelYear: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="AVAILABLE">Available (متاح للبيع)</option>
                        <option value="RESERVED">Reserved (محجوز)</option>
                        <option value="SOLD">Sold (مباع)</option>
                        <option value="IN_SERVICE">In Service (في الصيانة)</option>
                        <option value="DAMAGED">Damaged (تالف)</option>
                      </select>
                    </div>

                    {/* Cost price protection */}
                    {canViewCostPrice && (
                      <div className="col-md-4">
                        <label className="form-label">Purchase Cost (EGP) <span className="badge bg-danger-subtle text-danger">Admin Only</span></label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.purchaseCost}
                          onChange={(e) => setForm({ ...form, purchaseCost: Number(e.target.value) })}
                        />
                      </div>
                    )}
                    <div className={canViewCostPrice ? 'col-md-4' : 'col-md-6'}>
                      <label className="form-label">Selling Price (EGP)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.sellingPrice}
                        onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div className={canViewCostPrice ? 'col-md-4' : 'col-md-6'}>
                      <label className="form-label">B2B Price (EGP)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.b2bPrice}
                        onChange={(e) => setForm({ ...form, b2bPrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Key Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.keyNumber}
                        onChange={(e) => setForm({ ...form, keyNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Battery Serial</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.batteryNumber}
                        onChange={(e) => setForm({ ...form, batteryNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingVehicle(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingVehicle ? 'Save Changes' : 'Register Vehicle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Vehicle Modal */}
      {vehicleToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-trash me-2"></i> Confirm Delete Vehicle
                </h5>
                <button type="button" className="btn-close" onClick={() => setVehicleToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete vehicle with VIN <strong>"{vehicleToDelete.vin}"</strong>?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bi bi-info-circle me-1"></i> Stock balance for this vehicle unit will be reduced automatically. Sold vehicles cannot be deleted.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setVehicleToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(vehicleToDelete.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Vehicle Unit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
