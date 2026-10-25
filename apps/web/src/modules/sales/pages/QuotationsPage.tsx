import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function QuotationsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  const [form, setForm] = useState({
    branchId: '',
    customerId: '',
    validUntil: '',
    notes: '',
    items: [
      { productId: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 14 }
    ]
  });

  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['sales-quotations-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/quotations?limit=50');
      return res?.data || res;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches-select-quote'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches?limit=100');
      return res?.data || res;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-select-quote'],
    queryFn: async () => {
      const res: any = await apiClient.get('/customers?limit=100');
      return res?.data || res;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-select-quote'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=200');
      return res?.data || res;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/sales/quotations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-quotations-list'] });
      toast.success('Quotation generated successfully');
      setShowAddModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create quotation');
    },
  });

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 14 }]
    });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = (productsData || []).find((p: any) => p.id === productId);
    const updated = [...form.items];
    updated[index].productId = productId;
    if (prod) {
      updated[index].unitPrice = prod.retailPrice || 0;
    }
    setForm({ ...form, items: updated });
  };

  const quotes = quotesData || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Price Quotations & Proposals</h3>
          <p className="text-muted mb-0">Generate professional price quotes for customers, fleets, and corporate tenders</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-file-earmark-plus"></i>
          <span>Create Quotation</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading quotations...</div>
            </div>
          ) : quotes.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-file-earmark-text display-4 mb-3 text-secondary d-block"></i>
              <h5>No quotations issued yet</h5>
              <p>Create competitive quotations for prospective motorcycle buyers.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Quote #</th>
                    <th>Customer</th>
                    <th>Branch</th>
                    <th>Valid Until</th>
                    <th>Grand Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q: any) => (
                    <tr key={q.id}>
                      <td className="fw-bold font-monospace">{q.quotationNo}</td>
                      <td>
                        <div className="fw-semibold">{q.customer?.nameEn}</div>
                        <div className="small text-muted">{q.customer?.phone}</div>
                      </td>
                      <td>{q.branch?.nameEn}</td>
                      <td>{new Date(q.validUntil).toLocaleDateString()}</td>
                      <td className="fw-bold text-primary">{q.grandTotal?.toLocaleString()} EGP</td>
                      <td><span className="badge bg-secondary">{q.status}</span></td>
                      <td>{new Date(q.createdAt).toLocaleDateString()}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedQuote(q)}>
                          <i className="bi bi-printer me-1"></i> Print
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

      {/* Create Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Issue New Price Quotation</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Branch *</label>
                      <select
                        className="form-select"
                        required
                        value={form.branchId}
                        onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      >
                        <option value="">Select Branch...</option>
                        {(branchesData || []).map((b: any) => (
                          <option key={b.id} value={b.id}>{b.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
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
                    <div className="col-md-4">
                      <label className="form-label">Valid Until *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={form.validUntil}
                        onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      />
                    </div>
                  </div>

                  <h6 className="fw-bold border-bottom pb-1 mb-2">Quote Items</h6>
                  {form.items.map((it, idx) => (
                    <div key={idx} className="row g-2 align-items-center mb-2">
                      <div className="col-md-5">
                        <select
                          className="form-select form-select-sm"
                          required
                          value={it.productId}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                        >
                          <option value="">Select Product...</option>
                          {(productsData || []).map((p: any) => (
                            <option key={p.id} value={p.id}>{p.nameEn} ({p.sku})</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <input
                          type="number"
                          min="1"
                          className="form-control form-control-sm"
                          value={it.quantity}
                          onChange={(e) => {
                            const updated = [...form.items];
                            updated[idx].quantity = Number(e.target.value);
                            setForm({ ...form, items: updated });
                          }}
                        />
                      </div>
                      <div className="col-md-3">
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const updated = [...form.items];
                            updated[idx].unitPrice = Number(e.target.value);
                            setForm({ ...form, items: updated });
                          }}
                        />
                      </div>
                      <div className="col-md-2 text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={form.items.length === 1}
                          onClick={() => {
                            const updated = [...form.items];
                            updated.splice(idx, 1);
                            setForm({ ...form, items: updated });
                          }}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}

                  <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={addItemRow}>
                    + Add Product Line
                  </button>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    Save Quotation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {selectedQuote && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">Official Price Quotation</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedQuote(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                  <div>
                    <h4 className="fw-bold text-primary mb-1">HELPER ERP DEALERSHIP</h4>
                    <div className="text-muted small">Branch: {selectedQuote.branch?.nameEn}</div>
                  </div>
                  <div className="text-end font-monospace">
                    <h5 className="fw-bold mb-0">{selectedQuote.quotationNo}</h5>
                    <div className="text-muted small">Valid Until: {new Date(selectedQuote.validUntil).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="mb-3 small">
                  <span className="text-muted">Prepared For:</span>
                  <div className="fw-bold fs-6">{selectedQuote.customer?.nameEn}</div>
                  <div>Phone: {selectedQuote.customer?.phone}</div>
                </div>

                <table className="table table-bordered table-sm small">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Product Description</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuote.items?.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{it.product?.nameEn}</td>
                        <td className="text-center">{it.quantity}</td>
                        <td className="text-end">{it.unitPrice?.toLocaleString()} EGP</td>
                        <td className="text-end fw-bold">{it.totalPrice?.toLocaleString()} EGP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-end fs-5 fw-bold text-primary">
                  Grand Total: {selectedQuote.grandTotal?.toLocaleString()} EGP
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => window.print()}>
                  <i className="bi bi-printer me-1"></i> Print Quotation
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setSelectedQuote(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
