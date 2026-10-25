import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    invoiceId: '',
    warehouseId: '',
    reason: 'Customer requested model exchange',
    refundStatus: 'REFUNDED',
    notes: '',
    productId: '',
    quantity: 1,
    unitPrice: 0,
    condition: 'GOOD',
  });

  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['sales-returns-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/returns?limit=50');
      return res?.data || res;
    },
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-select-return'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/invoices?limit=100');
      return res?.data || res;
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-select-return'],
    queryFn: async () => {
      const res: any = await apiClient.get('/warehouses?limit=100');
      return res?.data || res;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/sales/returns', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-returns-list'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      toast.success('Return processed and inventory adjusted');
      setShowAddModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to process return');
    },
  });

  const handleInvoiceChange = (invId: string) => {
    const inv = (invoicesData || []).find((i: any) => i.id === invId);
    if (inv && inv.items?.length > 0) {
      const firstItem = inv.items[0];
      setForm({
        ...form,
        invoiceId: invId,
        warehouseId: inv.warehouseId,
        productId: firstItem.productId,
        quantity: 1,
        unitPrice: firstItem.unitPrice,
      });
    } else {
      setForm({ ...form, invoiceId: invId });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      invoiceId: form.invoiceId,
      warehouseId: form.warehouseId,
      reason: form.reason,
      refundStatus: form.refundStatus,
      notes: form.notes,
      items: [
        {
          productId: form.productId,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
          condition: form.condition,
        }
      ]
    });
  };

  const returns = returnsData || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Sales Returns & Refunds</h3>
          <p className="text-muted mb-0">Process customer returns, restock items back into inventory, and issue refunds</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-arrow-counterclockwise"></i>
          <span>Process Return</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading returns...</div>
            </div>
          ) : returns.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-arrow-counterclockwise display-4 mb-3 text-secondary d-block"></i>
              <h5>No returns found</h5>
              <p>Return records and refund notes will appear here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Return #</th>
                    <th>Original Invoice</th>
                    <th>Customer</th>
                    <th>Items Returned</th>
                    <th>Refund Amount</th>
                    <th>Refund Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r: any) => (
                    <tr key={r.id}>
                      <td className="fw-bold font-monospace">{r.returnNo}</td>
                      <td className="font-monospace text-primary">{r.invoice?.invoiceNo}</td>
                      <td>{r.customer?.nameEn}</td>
                      <td>
                        {(r.items || []).map((it: any) => (
                          <div key={it.id} className="small">
                            {it.product?.nameEn} (x{it.quantity}) - <span className="text-muted">{it.condition}</span>
                          </div>
                        ))}
                      </td>
                      <td className="fw-bold text-danger">{r.grandTotal?.toLocaleString()} EGP</td>
                      <td>
                        <span className="badge bg-secondary">{r.refundStatus}</span>
                      </td>
                      <td>{new Date(r.createdAt).toLocaleDateString()}</td>
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
                  <h5 className="modal-title fw-bold">Process Sales Return</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Select Original Invoice *</label>
                      <select
                        className="form-select"
                        required
                        value={form.invoiceId}
                        onChange={(e) => handleInvoiceChange(e.target.value)}
                      >
                        <option value="">Select Invoice...</option>
                        {(invoicesData || []).map((i: any) => (
                          <option key={i.id} value={i.id}>
                            {i.invoiceNo} — {i.customer?.nameEn} ({i.grandTotal?.toLocaleString()} EGP)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Restock Warehouse *</label>
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
                      <label className="form-label">Item Condition</label>
                      <select
                        className="form-select"
                        value={form.condition}
                        onChange={(e) => setForm({ ...form, condition: e.target.value })}
                      >
                        <option value="GOOD">Good (Restock to Inventory)</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="DEFECTIVE">Defective</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        required
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Unit Refund Price (EGP) *</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        required
                        value={form.unitPrice}
                        onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Refund Settlement</label>
                      <select
                        className="form-select"
                        value={form.refundStatus}
                        onChange={(e) => setForm({ ...form, refundStatus: e.target.value })}
                      >
                        <option value="REFUNDED">Immediate Cash Refund</option>
                        <option value="CREDITED_TO_ACCOUNT">Credit to Customer Account Balance</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Return Reason</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={createMutation.isPending}>
                    Confirm & Return Stock
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
