import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    type: 'CALL',
    subject: '',
    description: '',
    dueDate: '',
    status: 'PENDING',
  });

  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['sales-activities', statusFilter],
    queryFn: async () => {
      const res: any = await apiClient.get('/crm/activities', {
        params: { status: statusFilter || undefined },
      });
      return res?.data || res;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/crm/activities', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-activities'] });
      toast.success('Activity scheduled');
      setShowAddModal(false);
      setForm({ type: 'CALL', subject: '', description: '', dueDate: '', status: 'PENDING' });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create activity');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiClient.put(`/crm/activities/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-activities'] });
      toast.success('Activity updated');
    },
  });

  const activities = activitiesData || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Follow-ups, Calls & Sales Tasks</h3>
          <p className="text-muted mb-0">Never miss a customer follow-up, test-ride appointment, or quote callback</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-calendar-plus"></i>
          <span>Schedule Activity</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex gap-2">
            <button
              className={`btn btn-sm ${statusFilter === '' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter('')}
            >
              All Activities
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'PENDING' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter('PENDING')}
            >
              Pending Tasks
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'COMPLETED' ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading activities...</div>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-calendar-check display-4 mb-3 text-secondary d-block"></i>
              <h5>No activities found</h5>
              <p>Schedule reminder calls and client meetings.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Subject & Details</th>
                    <th>Due Date</th>
                    <th>Assigned Agent</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <i className={`bi ${a.type === 'CALL' ? 'bi-telephone' : a.type === 'MEETING' ? 'bi-people' : 'bi-check2-square'} me-1`}></i>
                          {a.type}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold">{a.subject}</div>
                        {a.description && <div className="small text-muted">{a.description}</div>}
                      </td>
                      <td>
                        {a.dueDate ? (
                          <span className="small font-monospace">
                            {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{a.user ? `${a.user.firstNameEn} ${a.user.lastNameEn}` : '—'}</td>
                      <td>
                        <span className={`badge ${a.status === 'COMPLETED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="text-end">
                        {a.status === 'PENDING' ? (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => toggleMutation.mutate({ id: a.id, status: 'COMPLETED' })}
                          >
                            <i className="bi bi-check-lg me-1"></i> Mark Done
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => toggleMutation.mutate({ id: a.id, status: 'PENDING' })}
                          >
                            Reopen
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
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Schedule Activity / Task</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Activity Type *</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        <option value="CALL">Phone Call</option>
                        <option value="MEETING">Showroom Meeting</option>
                        <option value="VISIT">Client Visit</option>
                        <option value="WHATSAPP">WhatsApp Follow-up</option>
                        <option value="TASK">Task / Reminder</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Due Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={form.dueDate}
                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Subject / Purpose *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        placeholder="e.g. Follow up on quotation discount request"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes & Details</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    Schedule
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
