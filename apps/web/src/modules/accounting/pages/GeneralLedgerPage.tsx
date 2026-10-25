import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function GeneralLedgerPage() {
  const { activeBranchId } = useAuth();
  const [branchId, setBranchId] = useState(activeBranchId || '');
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-select'],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/accounts');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches');
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch General Ledger
  const { data: ledgerGroups = [], isLoading } = useQuery({
    queryKey: ['general-ledger', branchId, accountId, startDate, endDate],
    queryFn: async () => {
      const res: any = await apiClient.get('/accounting/general-ledger', {
        params: {
          branchId: branchId || undefined,
          accountId: accountId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-book text-primary me-2"></i>
            دفتر الأستاذ العام (General Ledger)
          </h3>
          <p className="text-muted mb-0">كشف حركات الحسابات التفصيلية والأرصدة التراكمية المستمرة</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted mb-1">الحساب المالي المحدد:</label>
              <select
                className="form-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">جميع الحسابات النشطة</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.nameAr} ({a.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold text-muted mb-1">الفرع:</label>
              <select
                className="form-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">جميع الفروع (شامل)</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.nameAr || b.nameEn}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold text-muted mb-1">من تاريخ:</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold text-muted mb-1">إلى تاريخ:</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="col-md-1 text-end mt-4">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => { setAccountId(''); setBranchId(''); setStartDate(''); setEndDate(''); }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Accounts Accordion / Cards */}
      {isLoading ? (
        <div className="card border-0 shadow-sm p-5 text-center text-muted">
          <div className="spinner-border text-primary mb-2"></div>
          <div>جاري تجهيز دفتر الأستاذ العام...</div>
        </div>
      ) : ledgerGroups.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center text-muted">
          <i className="bi bi-folder-x fs-1 d-block mb-2 text-secondary"></i>
          لا توجد حركات مسجلة للحسابات المحددة في هذه الفترة
        </div>
      ) : (
        <div className="d-flex flex-column gap-4">
          {ledgerGroups.map((grp: any) => (
            <div key={grp.account.id} className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <span className="badge bg-primary font-monospace me-2">{grp.account.code}</span>
                  <strong className="fs-6">{grp.account.nameAr}</strong>
                  <span className="text-muted small ms-2">({grp.account.nameEn})</span>
                  <span className="badge bg-light text-dark border ms-2">{grp.account.type}</span>
                </div>
                <div className="d-flex gap-3 small font-monospace">
                  <span>إجمالي المدين: <strong className="text-success">{grp.totalDebit?.toLocaleString()} ج.م</strong></span>
                  <span>إجمالي الدائن: <strong className="text-primary">{grp.totalCredit?.toLocaleString()} ج.م</strong></span>
                  <span className="badge bg-secondary-subtle text-secondary fs-6">
                    الرصيد النهائي: {grp.closingBalance?.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 font-monospace" style={{ fontSize: '0.85rem' }}>
                    <thead className="table-light font-sans">
                      <tr>
                        <th className="ps-3">التاريخ</th>
                        <th>رقم القيد</th>
                        <th>الفرع</th>
                        <th>المصدر / المرجع</th>
                        <th>البيان / الوصف</th>
                        <th className="text-end">مدين (Debit)</th>
                        <th className="text-end">دائن (Credit)</th>
                        <th className="text-end pe-3">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(grp.transactions || []).map((t: any) => (
                        <tr key={t.id}>
                          <td className="ps-3">{new Date(t.entryDate).toLocaleDateString('ar-EG')}</td>
                          <td className="fw-bold text-primary">{t.entryNumber}</td>
                          <td className="font-sans">{t.branchName || 'الرئيسي'}</td>
                          <td>
                            <span className="badge bg-light text-dark border">{t.sourceType}</span>
                            {t.sourceNumber && <small className="ms-1 text-muted">({t.sourceNumber})</small>}
                          </td>
                          <td className="font-sans" style={{ maxWidth: '240px' }}>{t.description}</td>
                          <td className="text-end fw-bold text-success">
                            {t.debit > 0 ? t.debit.toLocaleString() : '—'}
                          </td>
                          <td className="text-end fw-bold text-primary">
                            {t.credit > 0 ? t.credit.toLocaleString() : '—'}
                          </td>
                          <td className="text-end pe-3 fw-bold text-dark fs-6">
                            {t.runningBalance?.toLocaleString()} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
