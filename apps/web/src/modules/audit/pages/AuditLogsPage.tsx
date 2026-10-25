import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: rawData, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/audit-logs?limit=100');
      return res.data;
    }
  });

  const data = (rawData || []).filter((log: any) => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (log.entityType && log.entityType.toLowerCase().includes(q)) ||
      (log.entityId && log.entityId.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.user?.email && log.user.email.toLowerCase().includes(q)) ||
      (log.ipAddress && log.ipAddress.includes(q))
    );
  });

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-journal-text me-2 text-danger"></i>
            Audit Trails & Security Logs
          </h3>
          <p className="text-muted small mb-0">Immutable records of critical user and system actions</p>
        </div>
        <button onClick={() => refetch()} className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-clockwise me-1"></i> تحديث
        </button>
      </div>

      {/* Filter Card */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-md-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="بحث بنوع السجل، المستخدم، رقم الحركة، أو الآي بي..."
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
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">جميع أنواع الحركات</option>
                <option value="create">إنشاء (Create)</option>
                <option value="update">تعديل (Update)</option>
                <option value="delete">حذف (Delete)</option>
                <option value="login">تسجيل دخول (Login)</option>
                <option value="logout">تسجيل خروج (Logout)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status"></div>
          <p className="mt-2 text-muted">Loading audit records...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> Failed to load audit records.
        </div>
      ) : (
        <div className="erp-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>User</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {data && data.length > 0 ? (
                  data.map((log: any) => (
                    <tr key={log.id}>
                      <td className="text-muted small font-monospace">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge bg-secondary">{log.action}</span>
                      </td>
                      <td className="fw-semibold">{log.entityType}</td>
                      <td className="small text-muted font-monospace">{log.entityId || '-'}</td>
                      <td>
                        {log.user ? `${log.user.firstNameEn} ${log.user.lastNameEn}` : 'System'}
                      </td>
                      <td className="small text-muted">{log.ipAddress || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
