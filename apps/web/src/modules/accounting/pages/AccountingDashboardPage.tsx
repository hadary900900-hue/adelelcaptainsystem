import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import { Link } from 'react-router-dom';

export default function AccountingDashboardPage() {
  const { activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState(activeBranchId || '');

  // Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Trial Balance
  const { data: tbData, isLoading: loadingTb } = useQuery({
    queryKey: ['accounting-trial-balance', branchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/trial-balance', {
        params: { branchId: branchId || undefined },
      });
      return res?.data?.data || res?.data;
    },
  });

  // Fetch Profit & Loss
  const { data: pnlData, isLoading: loadingPnl } = useQuery({
    queryKey: ['accounting-pnl', branchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/profit-and-loss', {
        params: { branchId: branchId || undefined },
      });
      return res?.data?.data || res?.data;
    },
  });

  // Fetch Balance Sheet
  const { data: bsData, isLoading: loadingBs } = useQuery({
    queryKey: ['accounting-bs', branchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/balance-sheet', {
        params: { branchId: branchId || undefined },
      });
      return res?.data?.data || res?.data;
    },
  });

  // Fetch Recent Journal Entries
  const { data: recentEntriesData } = useQuery({
    queryKey: ['recent-journal-entries', branchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/journal-entries', {
        params: { branchId: branchId || undefined, limit: 7 },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  const pnl = pnlData || { totalRevenue: 0, totalCogs: 0, grossProfit: 0, totalExpenses: 0, netProfit: 0 };
  const bs = bsData || { totalAssets: 0, totalLiabilities: 0, totalEquity: 0, grandEquity: 0, isBalanced: true };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-bank2 text-primary me-2"></i>
            النظام المالي والمحاسبي (Accounting & General Ledger)
          </h3>
          <p className="text-muted mb-0">نظام القيد المزدوج، دفتر اليومية والأستاذ، الميزانيات، والقوائم المالية</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/accounting/journal-entries" className="btn btn-outline-primary">
            <i className="bi bi-journal-plus me-1"></i> قيود اليومية
          </Link>
          <Link to="/accounting/expenses" className="btn btn-outline-danger">
            <i className="bi bi-wallet2 me-1"></i> تسجيل مصروف
          </Link>
          <Link to="/accounting/reports" className="btn btn-primary">
            <i className="bi bi-bar-chart-fill me-1"></i> القوائم المالية والتقارير
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-2">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-building text-muted"></i></span>
                <select
                  className="form-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">جميع فروع المنشأة (شامل)</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.nameAr || b.nameEn}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-8 text-end small text-muted">
              <span className="badge bg-success-subtle text-success me-2">
                <i className="bi bi-check-circle-fill me-1"></i> المحرك المحاسبي: قيد مزدوج متوازن
              </span>
              <span className="badge bg-primary-subtle text-primary">
                العملة الأساسية: EGP (جنيه مصري)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">إجمالي الإيرادات (Revenues)</span>
                <div className="bg-success-subtle text-success p-2 rounded">
                  <i className="bi bi-graph-up-arrow fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-1 font-monospace">
                {loadingPnl ? '...' : (pnl.totalRevenue || 0).toLocaleString()} <small className="fs-6">ج.م</small>
              </h4>
              <span className="text-muted small">مبيعات مركبات، قطع غيار، وصيانة</span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-warning border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">تكلفة البضاعة المباعة (COGS)</span>
                <div className="bg-warning-subtle text-warning p-2 rounded">
                  <i className="bi bi-box-seam fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-1 font-monospace">
                {loadingPnl ? '...' : (pnl.totalCogs || 0).toLocaleString()} <small className="fs-6">ج.م</small>
              </h4>
              <span className="text-muted small">
                مجمل الربح: <strong className="text-primary font-monospace">{loadingPnl ? '...' : (pnl.grossProfit || 0).toLocaleString()} ج.م</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">المصروفات التشغيلية (Expenses)</span>
                <div className="bg-danger-subtle text-danger p-2 rounded">
                  <i className="bi bi-cash-coin fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-1 font-monospace">
                {loadingPnl ? '...' : (pnl.totalExpenses || 0).toLocaleString()} <small className="fs-6">ج.م</small>
              </h4>
              <span className="text-muted small">إيجار، رواتب، مرافق، إهلاك</span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className={`card border-0 shadow-sm border-start border-4 h-100 ${
            pnl.netProfit >= 0 ? 'border-primary' : 'border-danger'
          }`}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">صافي الأرباح (Net Profit)</span>
                <div className={`p-2 rounded ${
                  pnl.netProfit >= 0 ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'
                }`}>
                  <i className="bi bi-trophy-fill fs-5"></i>
                </div>
              </div>
              <h4 className={`fw-bold mb-1 font-monospace ${
                pnl.netProfit >= 0 ? 'text-primary' : 'text-danger'
              }`}>
                {loadingPnl ? '...' : (pnl.netProfit || 0).toLocaleString()} <small className="fs-6">ج.م</small>
              </h4>
              <span className="text-muted small">بعد خصم التكلفة والمصروفات</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Sheet Highlights */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="p-3 bg-white border rounded shadow-sm">
            <span className="text-muted small d-block mb-1">إجمالي الأصول (Total Assets)</span>
            <div className="fs-5 fw-bold font-monospace text-success">
              {loadingBs ? '...' : (bs.totalAssets || 0).toLocaleString()} ج.م
            </div>
            <small className="text-muted">نقدية، بنوك، عملاء، مخزون، وأصول ثابتة</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 bg-white border rounded shadow-sm">
            <span className="text-muted small d-block mb-1">الالتزامات والخصوم (Total Liabilities)</span>
            <div className="fs-5 fw-bold font-monospace text-danger">
              {loadingBs ? '...' : (bs.totalLiabilities || 0).toLocaleString()} ج.م
            </div>
            <small className="text-muted">موردون، ضرائب مستحقة، رواتب مستحقة</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 bg-white border rounded shadow-sm">
            <span className="text-muted small d-block mb-1">حقوق الملكية (Total Equity)</span>
            <div className="fs-5 fw-bold font-monospace text-primary">
              {loadingBs ? '...' : (bs.grandEquity || 0).toLocaleString()} ج.م
            </div>
            <small className="text-muted">رأس المال + الأرباح المرحلة وصافي الفترة</small>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <Link to="/accounting/chart-of-accounts" className="card border-0 shadow-sm text-decoration-none text-dark h-100 hover-shadow transition-all">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <div className="bg-primary text-white p-3 rounded">
                <i className="bi bi-diagram-3 fs-4"></i>
              </div>
              <div>
                <h6 className="fw-bold mb-0">شجرة الحسابات</h6>
                <small className="text-muted">دليل الحسابات والأصول والخصوم</small>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-3">
          <Link to="/accounting/journal-entries" className="card border-0 shadow-sm text-decoration-none text-dark h-100 hover-shadow transition-all">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <div className="bg-success text-white p-3 rounded">
                <i className="bi bi-journal-text fs-4"></i>
              </div>
              <div>
                <h6 className="fw-bold mb-0">قيود اليومية العامة</h6>
                <small className="text-muted">تسجيل واستعراض القيود المحاسبية</small>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-3">
          <Link to="/accounting/general-ledger" className="card border-0 shadow-sm text-decoration-none text-dark h-100 hover-shadow transition-all">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <div className="bg-info text-white p-3 rounded">
                <i className="bi bi-book fs-4"></i>
              </div>
              <div>
                <h6 className="fw-bold mb-0">دفتر الأستاذ العام</h6>
                <small className="text-muted">كشف حركة ورصيد كل حساب تفصيلياً</small>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-3">
          <Link to="/accounting/reports" className="card border-0 shadow-sm text-decoration-none text-dark h-100 hover-shadow transition-all">
            <div className="card-body p-3 d-flex align-items-center gap-3">
              <div className="bg-warning text-dark p-3 rounded">
                <i className="bi bi-file-earmark-spreadsheet fs-4"></i>
              </div>
              <div>
                <h6 className="fw-bold mb-0">القوائم المالية</h6>
                <small className="text-muted">ميزان مراجعة، أرباح وخسائر، ميزانية</small>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Journal Entries Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0">
            <i className="bi bi-clock-history text-primary me-2"></i> أحدث قيود اليومية المسجلة
          </h5>
          <Link to="/accounting/journal-entries" className="btn btn-sm btn-outline-secondary">
            عرض كل القيود <i className="bi bi-arrow-left ms-1"></i>
          </Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th className="ps-3">رقم القيد</th>
                  <th>التاريخ</th>
                  <th>الفرع</th>
                  <th>البيان / الوصف</th>
                  <th>المصدر</th>
                  <th>إجمالي المدين</th>
                  <th>إجمالي الدائن</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(recentEntriesData || []).length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">لا توجد قيود مسجلة بعد</td></tr>
                ) : (
                  (recentEntriesData || []).map((je: any) => (
                    <tr key={je.id}>
                      <td className="ps-3 font-monospace fw-bold text-primary">{je.entryNumber}</td>
                      <td>{new Date(je.entryDate).toLocaleDateString('ar-EG')}</td>
                      <td>{je.branch?.nameAr || je.branch?.nameEn || 'المركز الرئيسي'}</td>
                      <td>{je.narration}</td>
                      <td>
                        <span className="badge bg-light text-dark border">{je.sourceType}</span>
                      </td>
                      <td className="font-monospace fw-bold text-success">
                        {je.totalDebit?.toLocaleString()} ج.م
                      </td>
                      <td className="font-monospace fw-bold text-primary">
                        {je.totalCredit?.toLocaleString()} ج.م
                      </td>
                      <td>
                        <span className={`badge ${
                          je.status === 'POSTED' ? 'bg-success' : 'bg-secondary'
                        }`}>
                          {je.status === 'POSTED' ? 'مرحل' : je.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
