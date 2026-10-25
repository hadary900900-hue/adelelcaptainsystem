import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function ProfitabilityPage() {
  const { activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState(activeBranchId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'products' | 'workshop' | 'expenses'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Detailed Profitability Data
  const { data: profitReport, isLoading } = useQuery({
    queryKey: ['detailed-profitability', branchId, startDate, endDate],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/reports/profitability', {
        params: { branchId: branchId || undefined, startDate: startDate || undefined, endDate: endDate || undefined },
      });
      return res?.data?.data || res?.data || {};
    },
  });

  const summary = profitReport?.summary || {};
  const breakdown = summary?.breakdown || {};
  const vehicles = profitReport?.vehicles || [];
  const products = profitReport?.products || [];
  const workshopJobs = profitReport?.workshopJobs || [];
  const expensesByCategory = breakdown?.expensesByCategory || [];

  // Filtered lists
  const filteredVehicles = vehicles.filter((v: any) =>
    (v.vin || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.productName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter((p: any) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWorkshop = workshopJobs.filter((w: any) =>
    (w.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.vin || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container-fluid py-4 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 bg-success bg-opacity-10 text-success rounded-3">
              <i className="bi bi-cash-coin fs-4"></i>
            </div>
            <div>
              <h4 className="fw-bold text-dark mb-0">نظام تحليل وحساب الأرباح الدقيق (Detailed Profitability)</h4>
              <p className="text-muted small mb-0">
                حساب حقيقي 100% لمجمل الأرباح، ربحية كل دراجة/مركبة بالشاسيه والـ VIN، وربحية قطع الغيار والورشة حتى صافي الربح
              </p>
            </div>
          </div>
        </div>

        {/* Global Filters */}
        <div className="d-flex flex-wrap align-items-center gap-2 bg-white p-2 rounded-3 border shadow-sm">
          <div className="d-flex align-items-center gap-1">
            <i className="bi bi-geo-alt text-primary small"></i>
            <select
              className="form-select form-select-sm border-0 bg-light"
              style={{ width: '160px' }}
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
            >
              <option value="">جميع الفروع والمعارض</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="vr mx-1"></div>

          <div className="d-flex align-items-center gap-1">
            <span className="small text-muted">من:</span>
            <input
              type="date"
              className="form-control form-control-sm border-0 bg-light"
              style={{ width: '135px' }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div className="d-flex align-items-center gap-1">
            <span className="small text-muted">إلى:</span>
            <input
              type="date"
              className="form-control form-control-sm border-0 bg-light"
              style={{ width: '135px' }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          {(startDate || endDate || branchId) && (
            <button
              className="btn btn-sm btn-outline-secondary border-0"
              onClick={() => { setStartDate(''); setEndDate(''); setBranchId(''); }}
              title="إعادة تعيين الفلاتر"
            >
              <i className="bi bi-x-circle"></i>
            </button>
          )}
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Total Revenue */}
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm bg-white p-3 rounded-3 border-start border-primary border-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">إجمالي المبيعات والإيرادات</span>
              <span className="badge bg-primary bg-opacity-10 text-primary p-2 rounded-2">
                <i className="bi bi-graph-up-arrow"></i>
              </span>
            </div>
            <h4 className="fw-bold text-dark mb-1">
              {isLoading ? '...' : (summary.totalRevenue || 0).toLocaleString()} <span className="small fs-6 text-muted">ج.م</span>
            </h4>
            <div className="small text-muted">
              تشمل مبيعات المركبات، قطع الغيار، ومصنعيات الورشة
            </div>
          </div>
        </div>

        {/* Total COGS */}
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm bg-white p-3 rounded-3 border-start border-warning border-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">تكلفة البضاعة المباعة (COGS)</span>
              <span className="badge bg-warning bg-opacity-10 text-warning p-2 rounded-2">
                <i className="bi bi-box-seam"></i>
              </span>
            </div>
            <h4 className="fw-bold text-warning mb-1">
              {isLoading ? '...' : (summary.totalCOGS || 0).toLocaleString()} <span className="small fs-6 text-muted">ج.م</span>
            </h4>
            <div className="small text-muted">
              تكلفة الشراء الفعلية للمركبات وتكلفة القطع المباعة
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm bg-white p-3 rounded-3 border-start border-info border-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">إجمالي مجمل الربح (Gross Profit)</span>
              <span className="badge bg-info bg-opacity-10 text-info p-2 rounded-2">
                {summary.grossMarginPct || 0}% هامش
              </span>
            </div>
            <h4 className="fw-bold text-info mb-1">
              {isLoading ? '...' : (summary.grossProfit || 0).toLocaleString()} <span className="small fs-6 text-muted">ج.م</span>
            </h4>
            <div className="small text-muted">
              المبيعات ناقص تكلفة البضاعة قبل المصروفات العامة
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm bg-white p-3 rounded-3 border-start border-success border-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold">صافي الربح النهائي (Net Profit)</span>
              <span className="badge bg-success bg-opacity-10 text-success p-2 rounded-2">
                {summary.netMarginPct || 0}% صافي
              </span>
            </div>
            <h4 className={`fw-bold mb-1 ${(summary.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {isLoading ? '...' : (summary.netProfit || 0).toLocaleString()} <span className="small fs-6 text-muted">ج.م</span>
            </h4>
            <div className="small text-muted">
              بعد خصم مصاريف التشغيل ({summary.totalOperatingExpenses || 0}) والرواتب ({summary.totalPayrollExpenses || 0})
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <ul className="nav nav-pills gap-1">
            <li className="nav-item">
              <button
                className={`nav-link px-3 py-2 small fw-semibold ${activeTab === 'overview' ? 'active shadow-sm' : 'text-dark'}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="bi bi-pie-chart-fill me-1"></i>
                نظرة شاملة وتوزيع الأرباح
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link px-3 py-2 small fw-semibold ${activeTab === 'vehicles' ? 'active shadow-sm' : 'text-dark'}`}
                onClick={() => setActiveTab('vehicles')}
              >
                <i className="bi bi-bicycle me-1"></i>
                ربحية المركبات والدراجات بالشاسيه ({vehicles.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link px-3 py-2 small fw-semibold ${activeTab === 'products' ? 'active shadow-sm' : 'text-dark'}`}
                onClick={() => setActiveTab('products')}
              >
                <i className="bi bi-gear-wide-connected me-1"></i>
                ربحية قطع الغيار والمنتجات ({products.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link px-3 py-2 small fw-semibold ${activeTab === 'workshop' ? 'active shadow-sm' : 'text-dark'}`}
                onClick={() => setActiveTab('workshop')}
              >
                <i className="bi bi-wrench-adjustable me-1"></i>
                ربحية أوامر شغل الورشة ({workshopJobs.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link px-3 py-2 small fw-semibold ${activeTab === 'expenses' ? 'active shadow-sm' : 'text-dark'}`}
                onClick={() => setActiveTab('expenses')}
              >
                <i className="bi bi-wallet2 me-1"></i>
                المصروفات والاستقطاعات التشغيلية
              </button>
            </li>
          </ul>

          {activeTab !== 'overview' && activeTab !== 'expenses' && (
            <div className="position-relative" style={{ width: '240px' }}>
              <input
                type="text"
                className="form-control form-control-sm pe-4"
                placeholder="بحث سريع (رقم، اسم، شاسيه)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <i className="bi bi-search position-absolute end-0 top-50 translate-middle-y me-2 text-muted small"></i>
            </div>
          )}
        </div>

        <div className="card-body p-4">
          {/* TAB 1: OVERVIEW & BREAKDOWN */}
          {activeTab === 'overview' && (
            <div className="row g-4">
              {/* Sector Gross Margin Comparison */}
              <div className="col-12 col-lg-7">
                <h6 className="fw-bold text-dark mb-3">مساهمة القطاعات في مجمل الأرباح</h6>
                <div className="table-responsive">
                  <table className="table align-middle border">
                    <thead className="table-light">
                      <tr>
                        <th>القطاع التشغيلي</th>
                        <th className="text-center">العمليات</th>
                        <th className="text-end">الإيراد</th>
                        <th className="text-end">التكلفة (COGS)</th>
                        <th className="text-end">مجمل الربح</th>
                        <th className="text-center">الهامش %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Vehicles */}
                      <tr>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="p-2 bg-primary bg-opacity-10 text-primary rounded-2">
                              <i className="bi bi-bicycle"></i>
                            </span>
                            <div>
                              <div className="fw-bold">مبيعات المعرض (المركبات)</div>
                              <div className="small text-muted">محسوبة بالتكلفة الفعلية لكل شاسيه</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center fw-semibold">{breakdown.vehicles?.count || 0} دراجة</td>
                        <td className="text-end">{(breakdown.vehicles?.revenue || 0).toLocaleString()} ج.م</td>
                        <td className="text-end text-warning">{(breakdown.vehicles?.cost || 0).toLocaleString()} ج.م</td>
                        <td className="text-end fw-bold text-success">{(breakdown.vehicles?.profit || 0).toLocaleString()} ج.م</td>
                        <td className="text-center">
                          <span className="badge bg-success bg-opacity-10 text-success">
                            {breakdown.vehicles?.marginPct || 0}%
                          </span>
                        </td>
                      </tr>

                      {/* Spare Parts */}
                      <tr>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="p-2 bg-info bg-opacity-10 text-info rounded-2">
                              <i className="bi bi-gear-wide"></i>
                            </span>
                            <div>
                              <div className="fw-bold">قطع الغيار والإكسسوارات</div>
                              <div className="small text-muted">فواتير البيع المباشر ونقاط البيع</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center fw-semibold">{breakdown.spareParts?.count || 0} صنف</td>
                        <td className="text-end">{(breakdown.spareParts?.revenue || 0).toLocaleString()} ج.م</td>
                        <td className="text-end text-warning">{(breakdown.spareParts?.cost || 0).toLocaleString()} ج.م</td>
                        <td className="text-end fw-bold text-success">{(breakdown.spareParts?.profit || 0).toLocaleString()} ج.م</td>
                        <td className="text-center">
                          <span className="badge bg-info bg-opacity-10 text-info">
                            {breakdown.spareParts?.marginPct || 0}%
                          </span>
                        </td>
                      </tr>

                      {/* Workshop */}
                      <tr>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="p-2 bg-warning bg-opacity-10 text-warning rounded-2">
                              <i className="bi bi-tools"></i>
                            </span>
                            <div>
                              <div className="fw-bold">خدمات وصيانة الورشة</div>
                              <div className="small text-muted">مصنعيات صافية + هامش ربح قطع الصيانة</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center fw-semibold">{breakdown.workshop?.count || 0} أمر شغل</td>
                        <td className="text-end">{((breakdown.workshop?.laborRevenue || 0) + (breakdown.workshop?.partsRevenue || 0)).toLocaleString()} ج.م</td>
                        <td className="text-end text-warning">{(breakdown.workshop?.partsCost || 0).toLocaleString()} ج.م</td>
                        <td className="text-end fw-bold text-success">{(breakdown.workshop?.profit || 0).toLocaleString()} ج.م</td>
                        <td className="text-center">
                          <span className="badge bg-warning bg-opacity-10 text-warning">
                            {breakdown.workshop?.marginPct || 0}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td>إجمالي مجمل الربح</td>
                        <td className="text-center">-</td>
                        <td className="text-end">{(summary.totalRevenue || 0).toLocaleString()} ج.م</td>
                        <td className="text-end text-warning">{(summary.totalCOGS || 0).toLocaleString()} ج.م</td>
                        <td className="text-end text-success">{(summary.grossProfit || 0).toLocaleString()} ج.م</td>
                        <td className="text-center">
                          <span className="badge bg-success">{summary.grossMarginPct || 0}%</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Profit Waterfall to Net Profit */}
              <div className="col-12 col-lg-5">
                <h6 className="fw-bold text-dark mb-3">تسلسل الأرباح حتى الصافي النهائي (Profit Waterfall)</h6>
                <div className="bg-light p-3 rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <span className="fw-semibold">إجمالي الإيرادات (Revenues)</span>
                    <span className="fw-bold text-dark">{(summary.totalRevenue || 0).toLocaleString()} ج.م</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom text-danger">
                    <span>- تكلفة البضاعة المباعة (COGS)</span>
                    <span>({(summary.totalCOGS || 0).toLocaleString()}) ج.م</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom bg-white px-2 rounded my-1">
                    <span className="fw-bold text-primary">= مجمل الربح التشغيلي (Gross Profit)</span>
                    <span className="fw-bold text-primary">{(summary.grossProfit || 0).toLocaleString()} ج.م</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom text-muted">
                    <span>- المصروفات الإدارية والتشغيلية المعتمدة</span>
                    <span className="text-danger">({(summary.totalOperatingExpenses || 0).toLocaleString()}) ج.م</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom text-muted">
                    <span>- تكلفة رواتب ومكافآت العاملين (Payroll)</span>
                    <span className="text-danger">({(summary.totalPayrollExpenses || 0).toLocaleString()}) ج.م</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-3 bg-white px-3 rounded shadow-sm border-2 border-success mt-2">
                    <div>
                      <div className="fw-bolder fs-5 text-success">الصافي النهائي للربح (Net Profit)</div>
                      <div className="small text-muted">هامش صافي: {summary.netMarginPct || 0}%</div>
                    </div>
                    <div className="fs-4 fw-bolder text-success">
                      {(summary.netProfit || 0).toLocaleString()} ج.م
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLES PROFITABILITY (VIN-LEVEL) */}
          {activeTab === 'vehicles' && (
            <div>
              <div className="alert alert-info py-2 small d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-info-circle-fill fs-5"></i>
                <span>
                  يعتمد حساب ربحية المركبة على <strong>تكلفة الشراء الفعلية (Purchase Cost)</strong> المسجلة عند استلام إذن الإضافة ومقارنتها بسعر بيع الفاتورة النهائي بعد الخصم.
                </span>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>رقم الفاتورة والتاريخ</th>
                      <th>الفرع</th>
                      <th>العميل</th>
                      <th>طراز الدراجة واللون</th>
                      <th>رقم الشاسيه (VIN)</th>
                      <th className="text-end">سعر البيع</th>
                      <th className="text-end">تكلفة الشراء</th>
                      <th className="text-end">صافي ربح الدراجة</th>
                      <th className="text-center">الهامش %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-4 text-muted">
                          لا توجد بيانات مبيعات مركبات مسجلة في هذا النطاق
                        </td>
                      </tr>
                    ) : (
                      filteredVehicles.map((v: any, idx: number) => (
                        <tr key={idx}>
                          <td>
                            <div className="fw-semibold text-primary">{v.invoiceNumber}</div>
                            <div className="small text-muted">{new Date(v.invoiceDate).toLocaleDateString('ar-EG')}</div>
                          </td>
                          <td><span className="badge bg-light text-dark border">{v.branchName}</span></td>
                          <td>{v.customerName}</td>
                          <td>
                            <div className="fw-bold">{v.productName}</div>
                            <div className="small text-muted">{v.modelName} | موديل {v.modelYear} | {v.color}</div>
                          </td>
                          <td>
                            <code className="bg-light px-2 py-1 rounded text-dark fw-bold">{v.vin}</code>
                          </td>
                          <td className="text-end fw-semibold">{(v.sellingPrice || 0).toLocaleString()} ج.م</td>
                          <td className="text-end text-muted">{(v.purchaseCost || 0).toLocaleString()} ج.م</td>
                          <td className={`text-end fw-bold ${v.grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                            {(v.grossProfit || 0).toLocaleString()} ج.م
                          </td>
                          <td className="text-center">
                            <span className={`badge ${v.marginPct >= 15 ? 'bg-success' : v.marginPct >= 5 ? 'bg-warning' : 'bg-danger'}`}>
                              {v.marginPct}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SPARE PARTS & PRODUCTS */}
          {activeTab === 'products' && (
            <div>
              <div className="alert alert-info py-2 small d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-info-circle-fill fs-5"></i>
                <span>
                  ترتيب قطع الغيار والمنتجات حسب <strong>إجمالي الأرباح المحققة</strong> بناءً على الكمية المباعة وتكلفة كل قطعة.
                </span>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>كود الصنف (SKU)</th>
                      <th>اسم القطعة / المنتج</th>
                      <th>النوع</th>
                      <th className="text-center">الكمية المباعة</th>
                      <th className="text-end">إجمالي الإيراد</th>
                      <th className="text-end">إجمالي التكلفة</th>
                      <th className="text-end">مجمل الربح</th>
                      <th className="text-center">الهامش %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-muted">
                          لا توجد مبيعات قطع غيار مسجلة في هذا النطاق
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p: any) => (
                        <tr key={p.productId}>
                          <td><code>{p.sku}</code></td>
                          <td className="fw-bold">{p.name}</td>
                          <td>
                            <span className="badge bg-secondary bg-opacity-10 text-secondary">
                              {p.type === 'SPARE_PART' ? 'قطعة غيار' : p.type === 'ACCESSORY' ? 'إكسسوار' : p.type}
                            </span>
                          </td>
                          <td className="text-center fw-semibold">{p.totalQuantitySold}</td>
                          <td className="text-end">{(p.totalRevenue || 0).toLocaleString()} ج.م</td>
                          <td className="text-end text-muted">{(p.totalCost || 0).toLocaleString()} ج.م</td>
                          <td className={`text-end fw-bold ${p.grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                            {(p.grossProfit || 0).toLocaleString()} ج.م
                          </td>
                          <td className="text-center">
                            <span className="badge bg-success bg-opacity-10 text-success">
                              {p.marginPct}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: WORKSHOP ORDERS */}
          {activeTab === 'workshop' && (
            <div>
              <div className="alert alert-info py-2 small d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-info-circle-fill fs-5"></i>
                <span>
                  تفصيل ربحية كل أمر صيانة: <strong>المصنعية (أجور العمل)</strong> تعتبر ربحاً خالصاً 100%، بينما <strong>قطع الغيار المستهلكة</strong> يحسب ربحها كفرق بين سعر بيعها وتكلفتها.
                </span>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>رقم أمر الشغل والتاريخ</th>
                      <th>الفرع</th>
                      <th>العميل</th>
                      <th>شاسيه المركبة (VIN)</th>
                      <th className="text-end">مصنعيات وخدمات (صافي)</th>
                      <th className="text-end">قطع غيار الصيانة</th>
                      <th className="text-end">تكلفة القطع</th>
                      <th className="text-end">إجمالي ربح أمر الشغل</th>
                      <th className="text-center">الهامش %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkshop.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-4 text-muted">
                          لا توجد أوامر شغل مكتملة مسجلة في هذا النطاق
                        </td>
                      </tr>
                    ) : (
                      filteredWorkshop.map((w: any, idx: number) => (
                        <tr key={idx}>
                          <td>
                            <div className="fw-semibold text-primary">{w.orderNumber}</div>
                            <div className="small text-muted">{new Date(w.date).toLocaleDateString('ar-EG')}</div>
                          </td>
                          <td><span className="badge bg-light text-dark border">{w.branchName}</span></td>
                          <td>{w.customerName}</td>
                          <td><code>{w.vin}</code></td>
                          <td className="text-end text-success fw-semibold">{(w.laborRevenue || 0).toLocaleString()} ج.م</td>
                          <td className="text-end">{(w.partsRevenue || 0).toLocaleString()} ج.م</td>
                          <td className="text-end text-muted">{(w.partsCost || 0).toLocaleString()} ج.م</td>
                          <td className="text-end fw-bold text-success">{(w.grossProfit || 0).toLocaleString()} ج.م</td>
                          <td className="text-center">
                            <span className="badge bg-success bg-opacity-10 text-success">
                              {w.marginPct}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: EXPENSES BREAKDOWN */}
          {activeTab === 'expenses' && (
            <div>
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <h6 className="fw-bold text-dark mb-3">توزيع المصروفات التشغيلية المعتمدة حسب البند</h6>
                  <div className="table-responsive">
                    <table className="table align-middle border">
                      <thead className="table-light">
                        <tr>
                          <th>بند المصروف</th>
                          <th className="text-end">القيمة</th>
                          <th className="text-center">النسبة من الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expensesByCategory.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-3 text-muted">لا توجد مصروفات مسجلة</td>
                          </tr>
                        ) : (
                          expensesByCategory.map((exp: any, i: number) => {
                            const pct = summary.totalOperatingExpenses > 0 ? Math.round((exp.amount / summary.totalOperatingExpenses) * 100) : 0;
                            return (
                              <tr key={i}>
                                <td className="fw-semibold">{exp.category}</td>
                                <td className="text-end text-danger fw-bold">{(exp.amount || 0).toLocaleString()} ج.م</td>
                                <td className="text-center">
                                  <span className="badge bg-danger bg-opacity-10 text-danger">{pct}%</span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot className="table-light fw-bold">
                        <tr>
                          <td>إجمالي المصروفات التشغيلية</td>
                          <td className="text-end text-danger">{(summary.totalOperatingExpenses || 0).toLocaleString()} ج.م</td>
                          <td className="text-center">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <h6 className="fw-bold text-dark mb-3">الرواتب والأجور الشهرية (Payroll)</h6>
                  <div className="p-4 bg-light rounded-3 border">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-3 fs-3">
                        <i className="bi bi-people-fill"></i>
                      </div>
                      <div>
                        <div className="text-muted small">إجمالي رواتب ومستحقات العاملين المصروفة</div>
                        <h4 className="fw-bold text-danger mb-0">
                          {(summary.totalPayrollExpenses || 0).toLocaleString()} <span className="fs-6 text-muted">ج.م</span>
                        </h4>
                      </div>
                    </div>
                    <p className="text-muted small mb-0">
                      يتم خصم هذا المبلغ تلقائياً من مجمل الأرباح للوصول إلى رقم صافي الربح النهائي بدقة بالغة.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
