import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  const [form, setForm] = useState({
    title: '',
    contactName: '',
    phone: '',
    email: '',
    source: 'WALK_IN',
    status: 'NEW',
    interestType: 'VEHICLE',
    estimatedValue: 0,
    notes: '',
    nextFollowUp: '',
  });

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['crm-leads', statusFilter, sourceFilter, search],
    queryFn: async () => {
      const res: any = await apiClient.get('/crm/leads', {
        params: { status: statusFilter || undefined, source: sourceFilter || undefined, search: search || undefined, limit: 50 },
      });
      return res?.data || res;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingLead) {
        return apiClient.put(`/crm/leads/${editingLead.id}`, payload);
      }
      return apiClient.post('/crm/leads', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success(editingLead ? 'Lead updated' : 'Lead created');
      setShowAddModal(false);
      setEditingLead(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to save lead');
    },
  });

  const handleOpenAdd = () => {
    setEditingLead(null);
    setForm({
      title: '',
      contactName: '',
      phone: '',
      email: '',
      source: 'WALK_IN',
      status: 'NEW',
      interestType: 'VEHICLE',
      estimatedValue: 0,
      notes: '',
      nextFollowUp: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (l: any) => {
    setEditingLead(l);
    setForm({
      title: l.title,
      contactName: l.contactName,
      phone: l.phone,
      email: l.email || '',
      source: l.source || 'WALK_IN',
      status: l.status || 'NEW',
      interestType: l.interestType || 'VEHICLE',
      estimatedValue: l.estimatedValue || 0,
      notes: l.notes || '',
      nextFollowUp: l.nextFollowUp ? new Date(l.nextFollowUp).toISOString().split('T')[0] : '',
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const leads = leadsData || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">CRM Sales Leads & Pipeline</h3>
          <p className="text-muted mb-0">Track prospect inquiries, potential vehicle buyers, and deal stages</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
          <i className="bi bi-funnel"></i>
          <span>Add New Lead</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="Search leads by contact name, phone, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Pipeline Stages</option>
                <option value="NEW">New Lead</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="PROPOSAL">Proposal / Quotation Sent</option>
                <option value="NEGOTIATION">In Negotiation</option>
                <option value="WON">Deal Won (Sold)</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option value="">All Sources</option>
                <option value="WALK_IN">Showroom Walk-in</option>
                <option value="PHONE">Phone Inquiry</option>
                <option value="WEBSITE">Website Form</option>
                <option value="SOCIAL">Social Media</option>
                <option value="REFERRAL">Customer Referral</option>
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
              <div>Loading CRM pipeline...</div>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-funnel display-4 mb-3 text-secondary d-block"></i>
              <h5>No leads found</h5>
              <p>Record your showroom visitors and incoming buyer leads.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Lead Title</th>
                    <th>Contact Person</th>
                    <th>Source</th>
                    <th>Stage</th>
                    <th>Interest</th>
                    <th>Estimated Budget</th>
                    <th>Next Follow-up</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l: any) => (
                    <tr key={l.id}>
                      <td>
                        <div className="fw-semibold">{l.title}</div>
                        {l.notes && <div className="small text-muted text-truncate" style={{ maxWidth: '200px' }}>{l.notes}</div>}
                      </td>
                      <td>
                        <div className="fw-medium">{l.contactName}</div>
                        <div className="small text-muted">{l.phone}</div>
                      </td>
                      <td><span className="badge bg-light text-dark border">{l.source}</span></td>
                      <td>
                        <span className={`badge ${
                          l.status === 'WON' ? 'bg-success' :
                          l.status === 'LOST' ? 'bg-danger' :
                          l.status === 'PROPOSAL' ? 'bg-info text-white' :
                          l.status === 'QUALIFIED' ? 'bg-primary' : 'bg-warning text-dark'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td><span className="badge bg-secondary">{l.interestType || 'VEHICLE'}</span></td>
                      <td className="fw-bold">{l.estimatedValue > 0 ? `${l.estimatedValue.toLocaleString()} EGP` : '—'}</td>
                      <td>
                        {l.nextFollowUp ? (
                          <span className="badge bg-light text-primary border">
                            <i className="bi bi-calendar-event me-1"></i>
                            {new Date(l.nextFollowUp).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleOpenEdit(l)}>
                          <i className="bi bi-pencil"></i>
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

      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">{editingLead ? 'Edit CRM Lead' : 'Create Sales Opportunity'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Opportunity / Lead Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Inquiring about 250cc Scooter for delivery"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Contact Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.contactName}
                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Lead Source</label>
                      <select
                        className="form-select"
                        value={form.source}
                        onChange={(e) => setForm({ ...form, source: e.target.value })}
                      >
                        <option value="WALK_IN">Showroom Walk-in</option>
                        <option value="PHONE">Phone Inquiry</option>
                        <option value="WEBSITE">Website</option>
                        <option value="SOCIAL">Social Media</option>
                        <option value="REFERRAL">Referral</option>
                        <option value="EXHIBITION">Exhibition / Event</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Pipeline Stage</label>
                      <select
                        className="form-select"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="PROPOSAL">Proposal Sent</option>
                        <option value="NEGOTIATION">Negotiation</option>
                        <option value="WON">Deal Won</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Estimated Budget (EGP)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={form.estimatedValue}
                        onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Next Follow-up Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.nextFollowUp}
                        onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Requirement & Conversation Notes</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Customer is looking for immediate cash delivery, interested in black or blue model..."
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Lead'}
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
