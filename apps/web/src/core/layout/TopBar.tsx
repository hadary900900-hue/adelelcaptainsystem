import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export default function TopBar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { user, logout, language, toggleLanguage, activeBranchId, setActiveBranchId } = useAuth();
  const { t } = useTranslation('nav');

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false);

  // Fetch unpaid sales invoices
  const { data: unpaidSales } = useQuery({
    queryKey: ['topbar-unpaid-sales'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/invoices', {
        params: { paymentStatus: 'UNPAID', limit: 10 },
      });
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 1000 * 60 * 5, // cache 5 minutes
  });

  // Fetch unpaid purchase invoices
  const { data: unpaidPurchase } = useQuery({
    queryKey: ['topbar-unpaid-purchase'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/invoices', {
        params: { paymentStatus: 'UNPAID', limit: 10 },
      });
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const salesUnpaid: any[] = unpaidSales || [];
  const purchaseUnpaid: any[] = unpaidPurchase || [];
  const totalNotif = salesUnpaid.length + purchaseUnpaid.length;

  // Theme state
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('erp-theme') || 'midnight-blue';
  });

  const themes = [
    { id: 'midnight-blue', name: 'أزرق كلاسيكي فاخر (Midnight)', color: '#2563EB', icon: 'bi-gem' },
    { id: 'emerald-luxury', name: 'زمردي راقي (Emerald Luxury)', color: '#059669', icon: 'bi-shield-check' },
    { id: 'racing-crimson', name: 'سباقات أحمر (Ducati Red)', color: '#DC2626', icon: 'bi-fire' },
    { id: 'dark-obsidian', name: 'ليلي داكن (Dark Obsidian)', color: '#0F172A', icon: 'bi-moon-stars-fill' },
    { id: 'silver', name: 'silver', color: '#708090', icon: 'bi-moon-stars-fill' },
    { id: 'lavender', name: 'lavender', color: '#8B5CF6', icon: 'bi-moon-stars-fill' },
    
    { id: 'bronzeMocha', name: 'bronzeMocha', color: '#C27803', icon: 'bi-moon-stars-fill' },



  ];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('erp-theme', currentTheme);
  }, [currentTheme]);

  const branches = user?.branches || [];

  return (
    <header className="topbar">
      {/* Left side: Hamburger toggle + Branch selector + Quick actions */}
      <div className="d-flex align-items-center gap-2.5">
        {/* Hamburger Toggle — visible on mobile/tablet */}
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title="فتح / إغلاق القائمة الجانبية"
        >
          <i className="bi bi-list fs-5" />
        </button>

        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="d-flex align-items-center gap-2 bg-info mx-2  bg-opacity-50 px-2 py-1 rounded-3 border">
            <span className="text-muted small d-none d-lg-inline fw-semibold">
              <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                          </span>
            <select
              className="form-select form-select-sm border-0 bg-transparent py-0 fw-bold"
              style={{ minWidth: '160px', cursor: 'pointer', outline: 'none', boxShadow: 'none' }}
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
            >
              {branches.map((b: any) => (
                <option  key={b.id} value={b.id}>
                  {language === 'ar' ? b.nameAr || b.nameEn : b.nameEn} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Access POS button in TopBar */}
        <Link
          to="/sales/pos"
          className="btn btn-sm btn-outline-primary d-none d-md-flex align-items-center gap-1.5 py-1 bg-tranparent fw-bold"
          style={{ borderRadius: '8px' }}
          title="نقطة البيع السريعة"
        >
          <i className="bi bi-calculator-fill text-primary"></i>
          <span>كاشير POS</span>
        </Link>
      </div>

      <div className="flex-grow-1"></div>

      {/* Right side: Themes + Quick Links + Notifications + Language + User Profile */}
      <div className="d-flex align-items-center gap-2">
        {/* Theme Selector Dropdown */}
        <div className="dropdown">
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5 dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            title="تغيير مظهر وثيم البرنامج"
            style={{ borderRadius: '8px', padding: '0.4rem 0.75rem' }}
          >
            <i className="bi bi-palette-fill ms-1 text-primary"></i>
            <span className="d-none d-sm-inline small fw-semibold">Thems</span>
          </button>
          <ul
            className="dropdown-menu dropdown-menu-end shadow-lg border-0 py-2 animate-fade-in"
            style={{ minWidth: '240px', borderRadius: '12px' }}
          >
            <li className="px-3 py-1 text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
              اختر ثيم البرنامج (Themes)
            </li>
            {themes.map(th => (
              <li key={th.id}>
                <button
                  className={`dropdown-item d-flex align-items-center gap-2.5 py-2 small ${
                    currentTheme === th.id ? 'active fw-bold' : ''
                  }`}
                  onClick={() => setCurrentTheme(th.id)}
                >
                  <span
                    className="rounded-circle d-inline-block border shadow-sm"
                    style={{ width: '15px', height: '15px', backgroundColor: th.color }}
                  ></span>
                  <span>{th.name}</span>
                  {currentTheme === th.id && <i className="bi bi-check2 ms-auto fs-6"></i>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          title="تغيير لغة العرض"
          style={{ borderRadius: '8px', padding: '0.4rem 0.65rem' }}
        >
          <i className="bi bi-translate"></i>
          <span className="small fw-semibold">{language === 'en' ? 'عربي' : 'EN'}</span>
        </button>

        {/* Notifications Bell — Real Unpaid Invoices */}
        <div className="dropdown" style={{ position: 'relative' }}>
          <button
            className="btn btn-sm btn-outline-secondary position-relative p-2 border-0"
            style={{ width: '38px', height: '38px', borderRadius: '8px' }}
            title="التنبيهات — الفواتير غير المسددة"
            onClick={() => setNotifOpen(o => !o)}
          >
            <i className={`bi bi-bell${totalNotif > 0 ? '-fill' : ''} fs-5 ${totalNotif > 0 ? 'text-warning' : 'text-muted'}`}></i>
            {totalNotif > 0 && (
              <span
                className="position-absolute bg-danger text-white d-flex align-items-center justify-content-center fw-bold"
                style={{
                  top: '2px', right: '2px',
                  width: '17px', height: '17px',
                  borderRadius: '50%', fontSize: '0.6rem',
                  lineHeight: 1,
                }}
              >
                {totalNotif > 99 ? '99+' : totalNotif}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {notifOpen && (
            <>
              {/* Backdrop to close */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 1039 }}
                onClick={() => setNotifOpen(false)}
              />
              <div
                dir="rtl"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '360px',
                  maxWidth: 'calc(100vw - 2rem)',
                  zIndex: 1040,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {/* Header */}
                <div
                  className="d-flex justify-content-between align-items-center px-3 py-2"
                  style={{
                    background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                    color: '#fff',
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-bell-fill text-warning" />
                    <span className="fw-bold" style={{ fontSize: '0.88rem' }}>
                      الفواتير غير المسددة
                    </span>
                  </div>
                  {totalNotif > 0 && (
                    <span className="badge bg-danger">{totalNotif} فاتورة</span>
                  )}
                </div>

                {/* Content */}
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {totalNotif === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-check-circle-fill text-success fs-3 d-block mb-2" />
                      <div style={{ fontSize: '0.85rem' }}>لا توجد فواتير متأخرة 🎉</div>
                    </div>
                  ) : (
                    <>
                      {/* Sales Section */}
                      {salesUnpaid.length > 0 && (
                        <div>
                          <div
                            className="px-3 py-1 fw-bold d-flex justify-content-between align-items-center"
                            style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', borderBottom: '1px solid #DBEAFE' }}
                          >
                            <span><i className="bi bi-receipt me-1" />فواتير المبيعات</span>
                            <span className="badge bg-primary">{salesUnpaid.length}</span>
                          </div>
                          {salesUnpaid.map((inv: any) => (
                            <div
                              key={inv.id}
                              className="d-flex justify-content-between align-items-center px-3 py-2"
                              style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                            >
                              <div>
                                <div className="fw-bold font-monospace text-primary" style={{ fontSize: '0.75rem' }}>
                                  {inv.invoiceNo}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  {inv.customer?.nameAr || inv.customer?.nameEn || 'عميل نقدي'}
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold text-danger font-monospace" style={{ fontSize: '0.82rem' }}>
                                  {Number(inv.balanceDue || inv.grandTotal).toLocaleString()} ج.م
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                  {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ar-EG') : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Purchase Section */}
                      {purchaseUnpaid.length > 0 && (
                        <div>
                          <div
                            className="px-3 py-1 fw-bold d-flex justify-content-between align-items-center"
                            style={{ fontSize: '0.75rem', background: '#F0FDF4', color: '#065F46', borderBottom: '1px solid #D1FAE5' }}
                          >
                            <span><i className="bi bi-bag me-1" />فواتير المشتريات</span>
                            <span className="badge bg-success">{purchaseUnpaid.length}</span>
                          </div>
                          {purchaseUnpaid.map((inv: any) => (
                            <div
                              key={inv.id}
                              className="d-flex justify-content-between align-items-center px-3 py-2"
                              style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                            >
                              <div>
                                <div className="fw-bold font-monospace text-success" style={{ fontSize: '0.75rem' }}>
                                  {inv.invoiceNo}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  {inv.supplier?.nameAr || inv.supplier?.nameEn || 'مورد'}
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold text-danger font-monospace" style={{ fontSize: '0.82rem' }}>
                                  {Number(inv.balanceDue || inv.grandTotal).toLocaleString()} ج.م
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                  {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('ar-EG') : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="d-flex gap-2 p-2"
                  style={{ borderTop: '1px solid var(--border-color)', background: 'var(--border-light)' }}
                >
                  {salesUnpaid.length > 0 && (
                    <Link
                      to="/sales/invoices"
                      className="btn btn-sm btn-primary flex-fill"
                      style={{ fontSize: '0.78rem', borderRadius: '8px' }}
                      onClick={() => setNotifOpen(false)}
                    >
                      <i className="bi bi-arrow-left me-1" />
                      فواتير المبيعات
                    </Link>
                  )}
                  {purchaseUnpaid.length > 0 && (
                    <Link
                      to="/purchasing/invoices"
                      className="btn btn-sm btn-success flex-fill"
                      style={{ fontSize: '0.78rem', borderRadius: '8px' }}
                      onClick={() => setNotifOpen(false)}
                    >
                      <i className="bi bi-arrow-left me-1" />
                      فواتير المشتريات
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Dropdown */}
        {user && (
          <div className="dropdown ms-1">
            <button
              className="btn btn-sm border-0 d-flex align-items-center gap-2 p-1"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{ borderRadius: '10px' }}
            >
              <div
                className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
                style={{
                  width: '38px',
                  height: '38px',
                  fontSize: '14px',
                  background: 'var(--primary-gradient)',
                }}
              >
                {(user.firstNameEn?.[0] || 'U') + (user.lastNameEn?.[0] || 'A')}
              </div>
              <div className="d-none d-md-block text-start me-1" style={{ lineHeight: '1.2' }}>
                <div className="fw-bold small text-main">
                  {language === 'ar' && (user.firstNameAr || user.lastNameAr)
                    ? `${user.firstNameAr} ${user.lastNameAr}`
                    : `${user.firstNameEn} ${user.lastNameEn}`}
                </div>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  {user.roles?.join(', ') || 'Admin'}
                </div>
              </div>
              <i className="bi bi-chevron-down small text-muted d-none d-sm-inline"></i>
            </button>

            <ul
              className="dropdown-menu dropdown-menu-end shadow-lg border-0 py-2 animate-fade-in"
              style={{ minWidth: '220px', borderRadius: '12px' }}
            >
              <li className="px-3 py-2 border-bottom">
                <div className="fw-bold small">
                  {user.firstNameEn} {user.lastNameEn}
                </div>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  {user.email}
                </div>
              </li>
              <li>
                <Link to="/settings" className="dropdown-item d-flex align-items-center gap-2 py-2 small">
                  <i className="bi bi-gear text-secondary"></i>
                  <span>إعدادات النظام</span>
                </Link>
              </li>
              <li>
                <Link to="/audit-logs" className="dropdown-item d-flex align-items-center gap-2 py-2 small">
                  <i className="bi bi-journal-text text-secondary"></i>
                  <span>سجل التدقيق والنشاط</span>
                </Link>
              </li>
              <li>
                <hr className="dropdown-divider my-1" />
              </li>
              <li>
                <button
                  onClick={logout}
                  className="dropdown-item d-flex align-items-center gap-2 py-2 small text-danger"
                >
                  <i className="bi bi-box-arrow-right"></i>
                  <span>{t('topbar.logout')}</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
