import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function FinancialReportsPage() {
  const { activeBranchId } = useAuth();
  const [activeReport, setActiveReport] = useState<'tb' | 'pnl' | 'bs' | 'cf'>('tb');
  const [branchId, setBranchId] = useState(activeBranchId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return res?.data?.data || res?.data || [];
    },
  });

  // 1. Trial Balance Query
  const { data: tbData, isLoading: loadingTb } = useQuery({
    queryKey: ['report-trial-balance', branchId, startDate, endDate],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/trial-balance', {
        params: { branchId: branchId || undefined, startDate: startDate || undefined, endDate: endDate || undefined },
      });
      return res?.data?.data || res?.data || { rows: [], summary: {} };
    },
    enabled: activeReport === 'tb',
  });

  // 2. Profit & Loss Query
  const { data: pnlData, isLoading: loadingPnl } = useQuery({
    queryKey: ['report-pnl', branchId, startDate, endDate],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/profit-and-loss', {
        params: { branchId: branchId || undefined, startDate: startDate || undefined, endDate: endDate || undefined },
      });
      return res?.data?.data || res?.data || {};
    },
    enabled: activeReport === 'pnl',
  });

  // 3. Balance Sheet Query
  const { data: bsData, isLoading: loadingBs } = useQuery({
    queryKey: ['report-bs', branchId, endDate],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/balance-sheet', {
        params: { branchId: branchId || undefined, asOfDate: endDate || undefined },
      });
      return res?.data?.data || res?.data || {};
    },
    enabled: activeReport === 'bs',
  });

  // 4. Cash Flow Query
  const { data: cfData, isLoading: loadingCf } = useQuery({
    queryKey: ['report-cf', branchId, startDate, endDate],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/cash-flow', {
        params: { branchId: branchId || undefined, startDate: startDate || undefined, endDate: endDate || undefined },
      });
      return res?.data?.data || res?.data || {};
    },
    enabled: activeReport === 'cf',
  });

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-file-earmark-spreadsheet text-primary me-2"></i>
            القوائم والتقارير المالية الختامية (Financial Statements)
          </h3>
          <p className="text-muted mb-0">ميزان المراجعة، الأرباح والخسائر، الميزانية العمومية، وقائمة التدفقات النقدية</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => window.print()}>
          <i className="bi bi-printer me-1"></i> طباعة التقرير
        </button>
      </div>

      {/* Report Selection Tabs & Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom pt-3 pb-0">
          <ul className="nav nav-tabs border-0">
            <li className="nav-item">
              <button
                className={`nav-link pb-3 ${activeReport === 'tb' ? 'active fw-bold text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                onClick={() => setActiveReport('tb')}
              >
                <i className="bi bi-table me-1"></i> ميزان المراجعة (Trial Balance)
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link pb-3 ${activeReport === 'pnl' ? 'active fw-bold text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                onClick={() => setActiveReport('pnl')}
              >
                <i className="bi bi-graph-up me-1"></i> قائمة الدخل والأرباح (Income Statement)
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link pb-3 ${activeReport === 'bs' ? 'active fw-bold text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                onClick={() => setActiveReport('bs')}
              >
                <i className="bi bi-columns me-1"></i> الميزانية العمومية (Balance Sheet)
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link pb-3 ${activeReport === 'cf' ? 'active fw-bold text-primary border-bottom border-primary border-3' : 'text-secondary'}`}
                onClick={() => setActiveReport('cf')}
              >
                <i className="bi bi-cash-stack me-1"></i> التدفقات النقدية (Cash Flow)
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <select
                className="form-select form-select-sm"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">جميع فروع المنشأة</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.nameAr || b.nameEn}</option>
                ))}
              </select>
            </div>
            {activeReport !== 'bs' ? (
              <>
                <div className="col-md-3">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="من تاريخ"
                  />
                </div>
                <div className="col-md-3">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="إلى تاريخ"
                  />
                </div>
              </>
            ) : (
              <div className="col-md-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light">الميزانية في تاريخ:</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="col-md-2 text-end">
              <button
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={() => { setBranchId(''); setStartDate(''); setEndDate(''); }}
              >
                إلغاء الفلتر
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. TRIAL BALANCE VIEW */}
      {activeReport === 'tb' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">ميزان المراجعة بالمجاميع والأرصدة</h5>
            {tbData?.summary?.isBalanced && (
              <span className="badge bg-success-subtle text-success border border-success">
                <i className="bi bi-check-circle-fill me-1"></i> ميزان المراجعة متوازن تماماً
              </span>
            )}
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 font-monospace" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light font-sans">
                  <tr>
                    <th rowSpan={2} className="ps-3 align-middle">كود الحساب</th>
                    <th rowSpan={2} className="align-middle">اسم الحساب</th>
                    <th rowSpan={2} className="align-middle">النوع</th>
                    <th colSpan={2} className="text-center bg-light border-start border-end">مجموع الحركات (Totals)</th>
                    <th colSpan={2} className="text-center bg-secondary-subtle">الأرصدة الصافية (Net Balance)</th>
                  </tr>
                  <tr>
                    <th className="text-end border-start">مدين (Debit)</th>
                    <th className="text-end border-end">دائن (Credit)</th>
                    <th className="text-end">مدين (Debit)</th>
                    <th className="text-end pe-3">دائن (Credit)</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTb ? (
                    <tr><td colSpan={7} className="text-center py-5">جاري استخراج ميزان المراجعة...</td></tr>
                  ) : (tbData?.rows || []).length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-5 text-muted">لا توجد حركات مسجلة</td></tr>
                  ) : (
                    tbData.rows.map((row: any) => (
                      <tr key={row.id}>
                        <td className="ps-3 fw-bold text-primary">{row.code}</td>
                        <td className="font-sans fw-semibold">{row.nameAr}</td>
                        <td className="font-sans"><span className="badge bg-light text-dark border">{row.type}</span></td>
                        <td className="text-end border-start text-success fw-bold">{row.totalDebit?.toLocaleString()}</td>
                        <td className="text-end border-end text-primary fw-bold">{row.totalCredit?.toLocaleString()}</td>
                        <td className="text-end text-success fw-bold">{row.netDebit > 0 ? row.netDebit?.toLocaleString() : '—'}</td>
                        <td className="text-end pe-3 text-primary fw-bold">{row.netCredit > 0 ? row.netCredit?.toLocaleString() : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="table-dark fw-bold font-monospace">
                  <tr>
                    <td colSpan={3} className="text-end font-sans">الإجمالي العام:</td>
                    <td className="text-end text-success">{tbData?.summary?.totalDebit?.toLocaleString()} ج.م</td>
                    <td className="text-end text-primary">{tbData?.summary?.totalCredit?.toLocaleString()} ج.م</td>
                    <td className="text-end text-success">{tbData?.summary?.netDebit?.toLocaleString()} ج.م</td>
                    <td className="text-end pe-3 text-primary">{tbData?.summary?.netCredit?.toLocaleString()} ج.م</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROFIT & LOSS VIEW */}
      {activeReport === 'pnl' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="fw-bold mb-0">قائمة الدخل - بيان الأرباح والخسائر</h5>
          </div>
          <div className="card-body p-4">
            {loadingPnl ? (
              <div className="p-5 text-center text-muted">جاري احتساب الأرباح والخسائر...</div>
            ) : (
              <div className="row g-4">
                {/* 1. Revenues */}
                <div className="col-12">
                  <h6 className="fw-bold text-success border-bottom pb-2">
                    <i className="bi bi-arrow-up-right-circle me-1"></i> أولاً: الإيرادات التشغيلية (Revenues)
                  </h6>
                  <table className="table table-sm align-middle font-monospace mb-2">
                    <tbody>
                      {(pnlData?.revenues || []).map((r: any) => (
                        <tr key={r.id}>
                          <td style={{ width: '150px' }} className="fw-bold text-muted">{r.code}</td>
                          <td className="font-sans">{r.nameAr}</td>
                          <td className="text-end fw-bold text-success">{r.amount?.toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan={2} className="font-sans">إجمالي الإيرادات:</td>
                        <td className="text-end text-success fs-6">{pnlData?.totalRevenue?.toLocaleString()} ج.م</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 2. COGS */}
                <div className="col-12">
                  <h6 className="fw-bold text-warning border-bottom pb-2">
                    <i className="bi bi-box-seam me-1"></i> ثانياً: تكلفة البضاعة المباعة (Cost of Goods Sold)
                  </h6>
                  <table className="table table-sm align-middle font-monospace mb-2">
                    <tbody>
                      {(pnlData?.cogs || []).map((c: any) => (
                        <tr key={c.id}>
                          <td style={{ width: '150px' }} className="fw-bold text-muted">{c.code}</td>
                          <td className="font-sans">{c.nameAr}</td>
                          <td className="text-end fw-bold text-warning">{c.amount?.toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan={2} className="font-sans">إجمالي تكلفة المبيعات:</td>
                        <td className="text-end text-warning fs-6">{pnlData?.totalCogs?.toLocaleString()} ج.م</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Gross Profit Banner */}
                <div className="col-12">
                  <div className="p-3 bg-primary-subtle border border-primary rounded d-flex justify-content-between align-items-center">
                    <span className="fs-5 fw-bold text-primary">مجمل الربح (Gross Profit = Revenues - COGS):</span>
                    <span className="fs-4 fw-bold font-monospace text-primary">{pnlData?.grossProfit?.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* 3. Expenses */}
                <div className="col-12">
                  <h6 className="fw-bold text-danger border-bottom pb-2">
                    <i className="bi bi-cash-coin me-1"></i> ثالثاً: المصروفات العمومية والتشغيلية (Operating Expenses)
                  </h6>
                  <table className="table table-sm align-middle font-monospace mb-2">
                    <tbody>
                      {(pnlData?.expenses || []).map((e: any) => (
                        <tr key={e.id}>
                          <td style={{ width: '150px' }} className="fw-bold text-muted">{e.code}</td>
                          <td className="font-sans">{e.nameAr}</td>
                          <td className="text-end fw-bold text-danger">{e.amount?.toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan={2} className="font-sans">إجمالي المصروفات:</td>
                        <td className="text-end text-danger fs-6">{pnlData?.totalExpenses?.toLocaleString()} ج.م</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Net Profit Final */}
                <div className="col-12">
                  <div className={`p-4 rounded border-2 d-flex justify-content-between align-items-center ${
                    pnlData?.netProfit >= 0 ? 'bg-success-subtle border border-success' : 'bg-danger-subtle border border-danger'
                  }`}>
                    <div>
                      <h4 className="fw-bold mb-1">
                        {pnlData?.netProfit >= 0 ? 'صافي أرباح الفترة (Net Operating Profit):' : 'صافي خسائر الفترة (Net Loss):'}
                      </h4>
                      <small className="text-muted">المبلغ المحول لحقوق الملكية والميزانية العمومية</small>
                    </div>
                    <div className={`display-6 fw-bold font-monospace ${pnlData?.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {pnlData?.netProfit?.toLocaleString()} ج.م
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. BALANCE SHEET VIEW */}
      {activeReport === 'bs' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">الميزانية العمومية والمركز المالي (Balance Sheet)</h5>
            {bsData?.isBalanced && (
              <span className="badge bg-success-subtle text-success border border-success">
                <i className="bi bi-check2-all me-1"></i> معادلة المركز المالي متطابقة: الأصول = الخصوم + حقوق الملكية
              </span>
            )}
          </div>
          <div className="card-body p-4">
            {loadingBs ? (
              <div className="p-5 text-center text-muted">جاري استخراج الميزانية العمومية...</div>
            ) : (
              <div className="row g-4">
                {/* Left: Assets */}
                <div className="col-md-6">
                  <div className="p-3 border rounded h-100 bg-light">
                    <h5 className="fw-bold text-success border-bottom pb-2">
                      <i className="bi bi-building me-1"></i> الأصول (Assets)
                    </h5>
                    <table className="table table-sm align-middle font-monospace mb-4">
                      <tbody>
                        {(bsData?.assets || []).map((a: any) => (
                          <tr key={a.id}>
                            <td className="text-muted small">{a.code}</td>
                            <td className="font-sans">{a.nameAr}</td>
                            <td className="text-end fw-bold text-success">{a.amount?.toLocaleString()} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 bg-white border rounded d-flex justify-content-between align-items-center mt-auto">
                      <strong className="fs-6">إجمالي الأصول:</strong>
                      <span className="fs-5 fw-bold font-monospace text-success">{bsData?.totalAssets?.toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Right: Liabilities & Equity */}
                <div className="col-md-6">
                  <div className="p-3 border rounded h-100 bg-light d-flex flex-column">
                    <h5 className="fw-bold text-danger border-bottom pb-2">
                      <i className="bi bi-file-earmark-lock me-1"></i> الالتزامات (Liabilities)
                    </h5>
                    <table className="table table-sm align-middle font-monospace mb-3">
                      <tbody>
                        {(bsData?.liabilities || []).map((l: any) => (
                          <tr key={l.id}>
                            <td className="text-muted small">{l.code}</td>
                            <td className="font-sans">{l.nameAr}</td>
                            <td className="text-end fw-bold text-danger">{l.amount?.toLocaleString()} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="fw-bold">
                        <tr>
                          <td colSpan={2} className="font-sans">مجموع الالتزامات:</td>
                          <td className="text-end text-danger">{bsData?.totalLiabilities?.toLocaleString()} ج.م</td>
                        </tr>
                      </tfoot>
                    </table>

                    <h5 className="fw-bold text-primary border-bottom pb-2 mt-2">
                      <i className="bi bi-gem me-1"></i> حقوق الملكية (Equity)
                    </h5>
                    <table className="table table-sm align-middle font-monospace mb-4">
                      <tbody>
                        {(bsData?.equity || []).map((eq: any) => (
                          <tr key={eq.id}>
                            <td className="text-muted small">{eq.code}</td>
                            <td className="font-sans">{eq.nameAr}</td>
                            <td className="text-end fw-bold text-primary">{eq.amount?.toLocaleString()} ج.م</td>
                          </tr>
                        ))}
                        <tr className="table-warning">
                          <td className="text-muted small">3103</td>
                          <td className="font-sans fw-bold">أرباح / (خسائر) العام الحالي</td>
                          <td className="text-end fw-bold">{bsData?.currentPeriodNetProfit?.toLocaleString()} ج.م</td>
                        </tr>
                      </tbody>
                      <tfoot className="fw-bold">
                        <tr>
                          <td colSpan={2} className="font-sans">مجموع حقوق الملكية:</td>
                          <td className="text-end text-primary">{bsData?.grandEquity?.toLocaleString()} ج.م</td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="p-3 bg-white border rounded d-flex justify-content-between align-items-center mt-auto">
                      <strong className="fs-6">إجمالي الخصوم وحقوق الملكية:</strong>
                      <span className="fs-5 fw-bold font-monospace text-primary">{bsData?.totalLiabilitiesAndEquity?.toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CASH FLOW VIEW */}
      {activeReport === 'cf' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">قائمة التدفقات النقدية (Cash Flow Statement)</h5>
            <div className="font-monospace fs-6">
              صافي التغير في النقدية: <strong className={cfData?.summary?.netChangeInCash >= 0 ? 'text-success' : 'text-danger'}>
                {cfData?.summary?.netChangeInCash?.toLocaleString()} ج.م
              </strong>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 font-monospace" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light font-sans">
                  <tr>
                    <th className="ps-3">التاريخ</th>
                    <th>رقم القيد</th>
                    <th>الحساب النقدي / البنكي</th>
                    <th>البيان / الوصف</th>
                    <th className="text-end">التدفق الداخل (+)</th>
                    <th className="text-end">التدفق الخارج (-)</th>
                    <th className="text-end pe-3">صافي الأثر</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCf ? (
                    <tr><td colSpan={7} className="text-center py-5">جاري التحميل...</td></tr>
                  ) : (cfData?.flows || []).length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-5 text-muted">لا توجد حركات نقدية مسجلة</td></tr>
                  ) : (
                    cfData.flows.map((f: any, idx: number) => (
                      <tr key={idx}>
                        <td className="ps-3">{new Date(f.date).toLocaleDateString('ar-EG')}</td>
                        <td className="fw-bold text-primary">{f.entryNumber}</td>
                        <td className="font-sans">{f.accountName}</td>
                        <td className="font-sans">{f.description}</td>
                        <td className="text-end text-success fw-bold">{f.inflow > 0 ? f.inflow.toLocaleString() : '—'}</td>
                        <td className="text-end text-danger fw-bold">{f.outflow > 0 ? f.outflow.toLocaleString() : '—'}</td>
                        <td className={`text-end pe-3 fw-bold ${f.net >= 0 ? 'text-success' : 'text-danger'}`}>
                          {f.net?.toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
