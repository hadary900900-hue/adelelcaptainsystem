import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';

export default function SalesDashboardPage() {
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const { data: branchesData } = useQuery({
    queryKey: ['branches-sales-dash'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches?limit=100');
      return res?.data || res;
    },
  });

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['sales-dashboard-metrics', selectedBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/dashboard', {
        params: { branchId: selectedBranchId || undefined }
      });
      return res?.data || res;
    },
  });

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Sales & Revenue Analytics</h3>
          <p className="text-muted mb-0">Overview of invoices, collections, pending debts, and customer acquisition</p>
        </div>
        <div style={{ width: '220px' }}>
          <select
            className="form-select form-select-sm"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value="">All Branches</option>
            {(branchesData || []).map((b: any) => (
              <option key={b.id} value={b.id}>{b.nameEn}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-5 text-center text-muted">
          <div className="spinner-border text-primary mb-2"></div>
          <div>Loading sales analytics...</div>
        </div>
      ) : (
        <div>
          {/* Metrics Row */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-semibold">TOTAL SALES REVENUE</span>
                  <i className="bi bi-cash-stack text-success fs-4"></i>
                </div>
                <h3 className="fw-bold text-dark mb-0">
                  {metrics?.totalSalesRevenue?.toLocaleString()} <small className="fs-6 text-muted">EGP</small>
                </h3>
                <div className="small text-muted mt-1">{metrics?.totalInvoices} Invoices issued</div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-semibold">TOTAL COLLECTED CASH</span>
                  <i className="bi bi-wallet2 text-primary fs-4"></i>
                </div>
                <h3 className="fw-bold text-primary mb-0">
                  {metrics?.totalCollected?.toLocaleString()} <small className="fs-6 text-muted">EGP</small>
                </h3>
                <div className="small text-success mt-1">Paid in Cash / Bank / POS</div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-semibold">OUTSTANDING RECEIVABLES</span>
                  <i className="bi bi-hourglass-split text-danger fs-4"></i>
                </div>
                <h3 className="fw-bold text-danger mb-0">
                  {metrics?.totalOutstanding?.toLocaleString()} <small className="fs-6 text-muted">EGP</small>
                </h3>
                <div className="small text-danger mt-1">{metrics?.unpaidInvoicesCount} Pending / Partial Bills</div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-0 shadow-sm p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small fw-semibold">REGISTERED CUSTOMERS</span>
                  <i className="bi bi-people-fill text-info fs-4"></i>
                </div>
                <h3 className="fw-bold text-dark mb-0">
                  {metrics?.totalCustomers?.toLocaleString()}
                </h3>
                <div className="small text-muted mt-1">Retail & B2B accounts</div>
              </div>
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <h5 className="fw-bold mb-0">Recent Sales Invoices</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Branch</th>
                      <th>Type</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics?.recentInvoices || []).map((inv: any) => (
                      <tr key={inv.id}>
                        <td className="fw-bold font-monospace">{inv.invoiceNo}</td>
                        <td>{inv.customer?.nameEn}</td>
                        <td>{inv.branch?.nameEn}</td>
                        <td><span className="badge bg-light text-dark border">{inv.invoiceType}</span></td>
                        <td className="fw-bold">{inv.grandTotal?.toLocaleString()} EGP</td>
                        <td className="text-success">{inv.paidAmount?.toLocaleString()} EGP</td>
                        <td className={inv.balanceDue > 0 ? 'text-danger fw-bold' : 'text-muted'}>
                          {inv.balanceDue?.toLocaleString()} EGP
                        </td>
                        <td>
                          <span className={`badge ${inv.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
