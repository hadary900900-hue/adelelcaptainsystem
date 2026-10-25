import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState<any>(null);

  const [form, setForm] = useState({
    customerCode: '',
    type: 'INDIVIDUAL',
    nameEn: '',
    nameAr: '',
    companyName: '',
    phone: '',
    email: '',
    nationalId: '',
    taxNumber: '',
    commercialReg: '',
    address: '',
    city: 'Cairo',
    creditLimit: 0,
    paymentTerms: 0,
    priceTier: 'RETAIL',
    notes: '',
  });

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers-list', search, typeFilter, tierFilter],
    queryFn: async () => {
      const res: any = await apiClient.get('/customers', {
        params: { search: search || undefined, type: typeFilter || undefined, priceTier: tierFilter || undefined, limit: 50 },
      });
      return res?.data || res;
    },
  });

  const { data: statementData, isLoading: loadingStatement } = useQuery({
    queryKey: ['customer-statement', selectedStatementCustomer?.id],
    queryFn: async () => {
      if (!selectedStatementCustomer) return null;
      const res: any = await apiClient.get(`/customers/${selectedStatementCustomer.id}/statement`);
      return res?.data || res;
    },
    enabled: !!selectedStatementCustomer,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingCustomer) {
        return apiClient.put(`/customers/${editingCustomer.id}`, payload);
      }
      return apiClient.post('/customers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      toast.success(editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
      setShowAddModal(false);
      setEditingCustomer(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to save customer');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      toast.success('Customer deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to delete customer');
    },
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setForm({
      customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'INDIVIDUAL',
      nameEn: '',
      nameAr: '',
      companyName: '',
      phone: '',
      email: '',
      nationalId: '',
      taxNumber: '',
      commercialReg: '',
      address: '',
      city: 'Cairo',
      creditLimit: 0,
      paymentTerms: 0,
      priceTier: 'RETAIL',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCustomer(c);
    setForm({
      customerCode: c.customerCode,
      type: c.type,
      nameEn: c.nameEn,
      nameAr: c.nameAr || '',
      companyName: c.companyName || '',
      phone: c.phone || '',
      email: c.email || '',
      nationalId: c.nationalId || '',
      taxNumber: c.taxNumber || '',
      commercialReg: c.commercialReg || '',
      address: c.address || '',
      city: c.city || 'Cairo',
      creditLimit: c.creditLimit || 0,
      paymentTerms: c.paymentTerms || 0,
      priceTier: c.priceTier || 'RETAIL',
      notes: c.notes || '',
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const customers = customersData || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Customer Management & Master File</h3>
          <p className="text-muted mb-0">Individuals, B2B Companies, Credit Limits, Balances & Statements</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
          <i className="bi bi-person-plus-fill"></i>
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="Search by code, name, company, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All Types (Individual & Company)</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="COMPANY">Company / Corporate</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
                <option value="">All Pricing Tiers</option>
                <option value="RETAIL">Retail Pricing</option>
                <option value="B2B">B2B Wholesale</option>
                <option value="CUSTOM">Custom Contract</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading customer directory...</div>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-people display-4 mb-3 text-secondary d-block"></i>
              <h5>No customers found</h5>
              <p>Add individual clients or corporate accounts to begin selling.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Customer Name</th>
                    <th>Type</th>
                    <th>Contact Info</th>
                    <th>Pricing Tier</th>
                    <th>Credit Limit</th>
                    <th>Balance</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c: any) => (
                    <tr key={c.id}>
                      <td className="fw-bold font-monospace">{c.customerCode}</td>
                      <td>
                        <div className="fw-semibold">{c.nameEn}</div>
                        {c.nameAr && <div className="small text-muted">{c.nameAr}</div>}
                        {c.companyName && <span className="badge bg-light text-dark border small mt-1">{c.companyName}</span>}
                      </td>
                      <td>
                        <span className={`badge ${c.type === 'COMPANY' ? 'bg-info text-white' : 'bg-secondary'}`}>
                          {c.type}
                        </span>
                      </td>
                      <td>
                        <div><i className="bi bi-telephone text-primary me-1"></i>{c.phone}</div>
                        {c.email && <div className="small text-muted"><i className="bi bi-envelope me-1"></i>{c.email}</div>}
                      </td>
                      <td>
                        <span className={`badge ${c.priceTier === 'B2B' ? 'bg-primary' : c.priceTier === 'CUSTOM' ? 'bg-warning text-dark' : 'bg-light text-dark border'}`}>
                          {c.priceTier}
                        </span>
                      </td>
                      <td>
                        {c.creditLimit > 0 ? (
                          <span>{c.creditLimit.toLocaleString()} EGP <small className="text-muted">({c.paymentTerms}d)</small></span>
                        ) : (
                          <span className="text-muted">No Credit</span>
                        )}
                      </td>
                      <td>
                        <span className={`fw-bold ${c.currentBalance > 0 ? 'text-danger' : c.currentBalance < 0 ? 'text-success' : 'text-muted'}`}>
                          {c.currentBalance.toLocaleString()} EGP
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-info"
                            title="Statement of Account"
                            onClick={() => setSelectedStatementCustomer(c)}
                          >
                            <i className="bi bi-file-earmark-spreadsheet me-1"></i> Statement
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            title="Edit Customer"
                            onClick={() => handleOpenEdit(c)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            title="Delete Customer"
                            onClick={() => {
                              if (window.confirm(`Permanently delete customer ${c.nameEn}?`)) {
                                deleteMutation.mutate(c.id);
                              }
                            }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
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

      {/* Statement of Account Modal */}
      {selectedStatementCustomer && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title fw-bold">Statement of Account</h5>
                  <div className="small text-muted">
                    {selectedStatementCustomer.nameEn} ({selectedStatementCustomer.customerCode}) — Phone: {selectedStatementCustomer.phone}
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedStatementCustomer(null)}></button>
              </div>
              <div className="modal-body p-4">
                {loadingStatement ? (
                  <div className="text-center p-4">
                    <div className="spinner-border text-primary"></div>
                  </div>
                ) : statementData ? (
                  <div>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded text-center">
                          <div className="text-muted small">Total Invoiced (Debit)</div>
                          <h4 className="fw-bold text-primary mb-0">{statementData.totalDebit?.toLocaleString()} EGP</h4>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded text-center">
                          <div className="text-muted small">Total Paid (Credit)</div>
                          <h4 className="fw-bold text-success mb-0">{statementData.totalCredit?.toLocaleString()} EGP</h4>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded text-center">
                          <div className="text-muted small">Current Balance Due</div>
                          <h4 className={`fw-bold mb-0 ${statementData.customer?.currentBalance > 0 ? 'text-danger' : 'text-success'}`}>
                            {statementData.customer?.currentBalance?.toLocaleString()} EGP
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered table-sm align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Transaction Type</th>
                            <th>Reference #</th>
                            <th>Details</th>
                            <th className="text-end">Debit (Invoice)</th>
                            <th className="text-end">Credit (Payment)</th>
                            <th className="text-end">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statementData.ledger?.map((row: any, idx: number) => (
                            <tr key={idx}>
                              <td>{new Date(row.date).toLocaleDateString()}</td>
                              <td>
                                <span className={`badge ${row.type === 'INVOICE' ? 'bg-primary' : 'bg-success'}`}>
                                  {row.type}
                                </span>
                              </td>
                              <td className="font-monospace fw-semibold">{row.ref}</td>
                              <td className="small text-muted">{row.details}</td>
                              <td className="text-end">{row.debit > 0 ? `${row.debit.toLocaleString()} EGP` : '—'}</td>
                              <td className="text-end text-success">{row.credit > 0 ? `${row.credit.toLocaleString()} EGP` : '—'}</td>
                              <td className="text-end fw-bold font-monospace">{row.runningBalance?.toLocaleString()} EGP</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div>No statement transactions.</div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => window.print()}>
                  <i className="bi bi-printer me-1"></i> Print Statement
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setSelectedStatementCustomer(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingCustomer ? 'Edit Customer Information' : 'Register New Customer'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Customer Code *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.customerCode}
                        onChange={(e) => setForm({ ...form, customerCode: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Customer Type *</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="COMPANY">Company / Corporate</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Price Tier</label>
                      <select
                        className="form-select"
                        value={form.priceTier}
                        onChange={(e) => setForm({ ...form, priceTier: e.target.value })}
                      >
                        <option value="RETAIL">Retail Pricing</option>
                        <option value="B2B">B2B Wholesale</option>
                        <option value="CUSTOM">Custom Contract</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Full Name (English) *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.nameEn}
                        onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Full Name (Arabic)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.nameAr}
                        onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      />
                    </div>

                    {form.type === 'COMPANY' && (
                      <div className="col-12">
                        <label className="form-label">Company Official Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.companyName}
                          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                          placeholder="e.g. Al-Ahram Logistics SAE"
                        />
                      </div>
                    )}

                    <div className="col-md-6">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="01012345678"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="client@domain.com"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">National ID / Passport</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.nationalId}
                        onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Tax ID (Company)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.taxNumber}
                        onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Commercial Registry (CR)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.commercialReg}
                        onChange={(e) => setForm({ ...form, commercialReg: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Credit Limit (EGP)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={form.creditLimit}
                        onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Payment Terms (Days)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={form.paymentTerms}
                        onChange={(e) => setForm({ ...form, paymentTerms: Number(e.target.value) })}
                        placeholder="e.g. 30 days"
                      />
                    </div>

                    <div className="col-md-8">
                      <label className="form-label">Street Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Customer'}
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
