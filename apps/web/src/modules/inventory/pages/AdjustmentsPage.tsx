import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function AdjustmentsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    warehouseId: '',
    reason: 'CORRECTION',
    notes: '',
    productId: '',
    countedQty: 0,
  });

  const { data: adjustmentsData, isLoading } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/adjustments', { params: { limit: 50 } });
      return res;
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-select-adjustments'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses', { params: { limit: 100 } });
      return (res as any)?.data || res;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-select-adjustments'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      return (res as any)?.data || res;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/inventory/adjustments', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Stock adjustment applied successfully!');
      setShowAddModal(false);
      setForm({
        warehouseId: '',
        reason: 'CORRECTION',
        notes: '',
        productId: '',
        countedQty: 0,
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to adjust stock');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      warehouseId: form.warehouseId,
      reason: form.reason,
      notes: form.notes,
      items: [
        {
          productId: form.productId,
          countedQty: Number(form.countedQty),
        },
      ],
    });
  };

  const adjustments = adjustmentsData?.data || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Stock Adjustments</h3>
          <p className="text-muted mb-0">Reconcile discrepancies, write off damages, and record verified physical counts</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-sliders"></i>
          <span>New Stock Adjustment</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading adjustments...</div>
            </div>
          ) : adjustments.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-sliders display-4 mb-3 text-secondary d-block"></i>
              <h5>No adjustments found</h5>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Adjustment #</th>
                    <th>Warehouse</th>
                    <th>Reason</th>
                    <th>Adjusted Items</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a: any) => (
                    <tr key={a.id}>
                      <td className="fw-bold font-monospace">{a.adjustmentNumber}</td>
                      <td>{a.warehouse?.nameEn}</td>
                      <td>
                        <span className="badge bg-secondary">{a.reason}</span>
                      </td>
                      <td>
                        {(a.items || []).map((i: any) => (
                          <div key={i.id} className="small">
                            <strong>{i.product?.nameEn}</strong>: counted {i.countedQty} (diff: {i.difference > 0 ? `+${i.difference}` : i.difference})
                          </div>
                        ))}
                      </td>
                      <td>
                        <span className="badge bg-success">{a.status}</span>
                      </td>
                      <td>{a.createdBy ? `${a.createdBy.firstNameEn} ${a.createdBy.lastNameEn}` : '—'}</td>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>
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
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Record Stock Adjustment</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Warehouse *</label>
                      <select
                        className="form-select"
                        required
                        value={form.warehouseId}
                        onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                      >
                        <option value="">Select Warehouse</option>
                        {(warehousesData || []).map((w: any) => (
                          <option key={w.id} value={w.id}>{w.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Reason *</label>
                      <select
                        className="form-select"
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      >
                        <option value="COUNT_DISCREPANCY">Physical Count Discrepancy</option>
                        <option value="DAMAGED">Damaged Goods</option>
                        <option value="EXPIRED">Expired / Obsolete</option>
                        <option value="THEFT">Loss / Theft</option>
                        <option value="CORRECTION">Inventory Correction</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Product *</label>
                      <select
                        className="form-select"
                        required
                        value={form.productId}
                        onChange={(e) => setForm({ ...form, productId: e.target.value })}
                      >
                        <option value="">Select Product</option>
                        {(productsData || []).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.nameEn} ({p.sku})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Actual Counted Quantity *</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        required
                        value={form.countedQty}
                        onChange={(e) => setForm({ ...form, countedQty: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Notes</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="e.g. Stock count audit"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Adjusting...' : 'Save & Adjust Stock'}
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
