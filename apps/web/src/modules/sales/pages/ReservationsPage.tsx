import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    branchId: '',
    warehouseId: '',
    customerId: '',
    vehicleUnitId: '',
    productId: '',
    depositAmount: 5000,
    totalPrice: 0,
    expiresAt: '',
    notes: '',
  });

  const { data: reservationsData, isLoading } = useQuery({
    queryKey: ['vehicle-reservations-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/crm/reservations');
      return res?.data || res;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches-select-res'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches?limit=100');
      return res?.data || res;
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-select-res', form.branchId],
    queryFn: async () => {
      if (!form.branchId) return [];
      const res: any = await apiClient.get('/warehouses', { params: { branchId: form.branchId } });
      return res?.data || res;
    },
    enabled: !!form.branchId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-select-res'],
    queryFn: async () => {
      const res: any = await apiClient.get('/customers?limit=100');
      return res?.data || res;
    },
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-select-res', form.warehouseId],
    queryFn: async () => {
      if (!form.warehouseId) return [];
      const res: any = await apiClient.get('/vehicles', { params: { warehouseId: form.warehouseId, status: 'AVAILABLE' } });
      return res?.data || res;
    },
    enabled: !!form.warehouseId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/crm/reservations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-reservations-list'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-select-res'] });
      toast.success('Vehicle reserved and locked successfully');
      setShowAddModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create reservation');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/crm/reservations/${id}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-reservations-list'] });
      toast.success('Reservation cancelled and vehicle released to stock');
    },
  });

  const handleVehicleSelect = (unitId: string) => {
    const v = (vehiclesData || []).find((u: any) => u.id === unitId);
    if (v) {
      setForm({
        ...form,
        vehicleUnitId: unitId,
        productId: v.productId,
        totalPrice: v.sellingPrice || 0,
      });
    }
  };

  const reservations = reservationsData || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Vehicle Unit Reservations</h3>
          <p className="text-muted mb-0">Lock specific VIN units for buyers with down-payment deposits and expiry protection</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-bookmark-plus"></i>
          <span>New Vehicle Reservation</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading reservations...</div>
            </div>
          ) : reservations.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-bookmark-star display-4 mb-3 text-secondary d-block"></i>
              <h5>No reservations active</h5>
              <p>Reserve incoming or showroom vehicles for customers.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Reservation #</th>
                    <th>Customer</th>
                    <th>Vehicle Model</th>
                    <th>Chassis / VIN</th>
                    <th>Deposit (EGP)</th>
                    <th>Total Price</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r: any) => (
                    <tr key={r.id}>
                      <td className="fw-bold font-monospace">{r.reservationNo}</td>
                      <td>
                        <div className="fw-semibold">{r.customer?.nameEn}</div>
                        <div className="small text-muted">{r.customer?.phone}</div>
                      </td>
                      <td>{r.product?.nameEn}</td>
                      <td className="font-monospace text-primary fw-bold">{r.vehicleUnit?.vin}</td>
                      <td className="fw-bold text-success">{r.depositAmount?.toLocaleString()} EGP</td>
                      <td>{r.totalPrice?.toLocaleString()} EGP</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {new Date(r.expiresAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.status === 'ACTIVE' ? 'bg-primary' : r.status === 'CONVERTED_TO_SALE' ? 'bg-success' : 'bg-secondary'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-end">
                        {r.status === 'ACTIVE' && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              if (window.confirm(`Cancel reservation for VIN ${r.vehicleUnit?.vin}?`)) {
                                cancelMutation.mutate(r.id);
                              }
                            }}
                          >
                            Release
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Reserve Vehicle Unit</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Branch *</label>
                      <select
                        className="form-select"
                        required
                        value={form.branchId}
                        onChange={(e) => setForm({ ...form, branchId: e.target.value, warehouseId: '' })}
                      >
                        <option value="">Select Branch...</option>
                        {(branchesData || []).map((b: any) => (
                          <option key={b.id} value={b.id}>{b.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Warehouse *</label>
                      <select
                        className="form-select"
                        required
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
                      <label className="form-label">Customer *</label>
                      <select
                        className="form-select"
                        required
                        value={form.customerId}
                        onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                      >
                        <option value="">Select Customer...</option>
                        {(customersData || []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.nameEn}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Available Vehicle Unit (VIN) *</label>
                      <select
                        className="form-select"
                        required
                        value={form.vehicleUnitId}
                        onChange={(e) => handleVehicleSelect(e.target.value)}
                      >
                        <option value="">Select Available Vehicle...</option>
                        {(vehiclesData || []).map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.product?.nameEn} — VIN: {v.vin} ({v.color})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Deposit Received (EGP) *</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        required
                        value={form.depositAmount}
                        onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Agreed Total Price (EGP) *</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        required
                        value={form.totalPrice}
                        onChange={(e) => setForm({ ...form, totalPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Reservation Expiry Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={form.expiresAt}
                        onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    Lock & Reserve
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
