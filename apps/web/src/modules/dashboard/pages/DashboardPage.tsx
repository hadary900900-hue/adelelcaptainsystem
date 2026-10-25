import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res: any = await apiClient.get('/dashboard');
      return res.data;
    }
  });

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">{t('title')}</h2>
          <p className="text-muted mb-0">
            Welcome back, <span className="fw-semibold text-primary">{user?.firstNameEn} {user?.lastNameEn}</span>. Phase 1 ERP Foundation active.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Loading ERP dashboard metrics...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Failed to load dashboard metrics. Ensure backend server and database are running.
        </div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="erp-card p-4 border-start border-4 border-primary">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small text-uppercase fw-semibold">{t('stats.totalBranches')}</span>
                    <h2 className="fw-bold mt-2 mb-0 text-dark">{data?.totalBranches ?? 0}</h2>
                  </div>
                  <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                    <i className="bi bi-building fs-3"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="erp-card p-4 border-start border-4 border-success">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small text-uppercase fw-semibold">{t('stats.totalWarehouses')}</span>
                    <h2 className="fw-bold mt-2 mb-0 text-dark">{data?.totalWarehouses ?? 0}</h2>
                  </div>
                  <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle">
                    <i className="bi bi-box-seam-fill fs-3"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="erp-card p-4 border-start border-4 border-info">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small text-uppercase fw-semibold">Total Users</span>
                    <h2 className="fw-bold mt-2 mb-0 text-dark">{data?.totalUsers ?? 0}</h2>
                  </div>
                  <div className="bg-info bg-opacity-10 text-info p-3 rounded-circle">
                    <i className="bi bi-people-fill fs-3"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="erp-card p-4 border-start border-4 border-warning">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small text-uppercase fw-semibold">System Status</span>
                    <h5 className="fw-bold mt-2 mb-0 text-success">
                      <i className="bi bi-check-circle-fill me-1"></i> {data?.systemStatus?.database || 'Online'}
                    </h5>
                  </div>
                  <div className="bg-warning bg-opacity-10 text-warning p-3 rounded-circle">
                    <i className="bi bi-cpu-fill fs-3"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="erp-card p-4">
                <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-primary"></i> Recent Audit Activity
                </h5>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>User</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.recentAuditLogs?.length > 0 ? (
                        data.recentAuditLogs.map((log: any) => (
                          <tr key={log.id}>
                            <td>
                              <span className="badge bg-secondary">{log.action}</span>
                            </td>
                            <td>{log.entityType}</td>
                            <td>
                              {log.user ? `${log.user.firstNameEn} ${log.user.lastNameEn}` : 'System'}
                            </td>
                            <td className="text-muted small">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-muted">
                            No audit activity recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="erp-card p-4">
                <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-info-circle text-info"></i> System Information
                </h5>
                <ul className="list-group list-group-flush small">
                  <li className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Version</span>
                    <span className="fw-semibold">1.0.0 (Phase 1)</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">ERP Industry</span>
                    <span className="fw-semibold">Motorcycles & Scooters</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Database</span>
                    <span className="text-success fw-semibold">PostgreSQL + Prisma</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Uptime</span>
                    <span className="fw-semibold">{Math.floor(data?.systemStatus?.uptime || 0)}s</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
