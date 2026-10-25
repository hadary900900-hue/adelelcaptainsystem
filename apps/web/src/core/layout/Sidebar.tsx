import { useState, useEffect } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';



export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: any) {

  const { t } = useTranslation('nav');

  const location = useLocation();
  const { user, hasPermission } = useAuth();

  // Hidden endpoints/sections state - Default is empty [] (All visible by default)
  const [hiddenSections, setHiddenSections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sidebar_hidden_sections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showConfigModal, setShowConfigModal] = useState(false);

  const toggleHideSection = (sectionId: string) => {
    setHiddenSections(prev => {
      const next = prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId];
      try {
        localStorage.setItem('sidebar_hidden_sections', JSON.stringify(next));
      } catch {}
      return next;
    });
  };



  const sections = [

    {

      id: 'core',

      title: 'الرئيسية ',

      icon: 'bi-speedometer2',

      links: [

        { to: '/', icon: 'bi-grid-1x2-fill', label: t('sidebar.dashboard') },

      ]

    },

    {

      id: 'crm',

      permission: 'sidebar.crm',

      title: 'العملاء وإدارة العلاقات (CRM)',

      icon: 'bi-people-fill',

      links: [

        { to: '/customers', icon: 'bi-people', label: 'دليل العملاء' },

        { to: '/crm/leads', icon: 'bi-funnel-fill', label: 'العملاء المحتملين (Leads)' },

        { to: '/crm/activities', icon: 'bi-calendar-check', label: 'المتابعات والمهام' },

      ]

    },

    {

      id: 'sales',

      permission: 'sidebar.sales',

      title: 'المبيعات ونقاط البيع (Sales & POS)',

      icon: 'bi-receipt-cutoff',

      links: [

        { to: '/sales/pos', icon: 'bi-calculator-fill', label: 'كاشير نقطة البيع (POS)' },

        { to: '/sales/dashboard', icon: 'bi-graph-up-arrow', label: 'لوحة تحكم المبيعات' },

        { to: '/sales/invoices', icon: 'bi-receipt', label: 'فواتير المبيعات' },

        { to: '/sales/quotations', icon: 'bi-file-earmark-text', label: 'عروض الأسعار' },

        { to: '/sales/orders', icon: 'bi-cart-check-fill', label: 'أوامر البيع' },

        { to: '/sales/returns', icon: 'bi-arrow-counterclockwise', label: 'مرتجعات المبيعات' },

        { to: '/sales/reservations', icon: 'bi-bookmark-star-fill', label: 'حجوزات المركبات' },

      ]

    },

    {

      id: 'workshop',

      permission: 'sidebar.workshop',

      title: 'إدارة الورشة والصيانة (Workshop)',

      icon: 'bi-tools',

      links: [

        { to: '/workshop/reception', icon: 'bi-box-arrow-in-down-right', label: 'استقبال مركبة جديدة' },

        { to: '/workshop/work-orders', icon: 'bi-wrench-adjustable', label: 'أوامر الشغل والصيانة' },

        { to: '/workshop/services', icon: 'bi-card-checklist', label: 'كتالوج خدمات الصيانة' },

      ]

    },

    {

      id: 'inventory',

      permission: 'sidebar.inventory',

      title: 'المخازن والمخزون (Inventory)',

      icon: 'bi-boxes',

      links: [

        { to: '/stock-overview', icon: 'bi-boxes', label: 'جرد ورصيد المخزون' },

        { to: '/inventory', icon: 'bi-clipboard-data-fill', label: t('sidebar.inventory') },

        { to: '/transfers', icon: 'bi-arrow-left-right', label: t('sidebar.transfers') },

        { to: '/stock-orders', icon: 'bi-box-seam', label: 'طلبات التزويد (نواقص)' },

        { to: '/adjustments', icon: 'bi-sliders', label: t('sidebar.adjustments') },

        { to: '/warehouses', icon: 'bi-building-fill-gear', label: t('sidebar.warehouses') },

      ]

    },

    {

      id: 'catalog',

      permission: 'sidebar.catalog',

      title: 'المنتجات والكتالوج (Products)',

      icon: 'bi-box-seam-fill',

      links: [

        { to: '/products', icon: 'bi-box-seam', label: t('sidebar.products') },

        { to: '/vehicles', icon: 'bi-bicycle', label: t('sidebar.vehicles') },

        { to: '/spare-parts', icon: 'bi-gear-wide-connected', label: t('sidebar.spareParts') },

        { to: '/categories', icon: 'bi-tags-fill', label: t('sidebar.categories') },

        { to: '/brands', icon: 'bi-award-fill', label: t('sidebar.brands') },

      ]

    },

    {

      id: 'purchasing',

      permission: 'sidebar.purchasing',

      title: 'المشتريات والموردين (Purchasing)',

      icon: 'bi-cart-plus-fill',

      links: [

        { to: '/purchasing/dashboard', icon: 'bi-graph-up', label: 'لوحة تحكم المشتريات' },

        { to: '/purchasing/suppliers', icon: 'bi-truck', label: 'دليل الموردين والحسابات' },

        { to: '/purchasing/orders', icon: 'bi-cart-check', label: 'أوامر الشراء (PO)' },

        { to: '/purchasing/goods-receipts', icon: 'bi-box-arrow-in-down', label: 'إذونات استلام البضاعة' },

        { to: '/purchasing/invoices', icon: 'bi-receipt-cutoff', label: 'فواتير الشراء والذمم (AP)' },

        { to: '/purchasing/returns', icon: 'bi-arrow-return-left', label: 'مرتجع المشتريات' },

      ]

    },

    {

      id: 'accounting',

      permission: 'sidebar.accounting',

      title: 'النظام المحاسبي والمالي (Accounting)',

      icon: 'bi-bank2',

      links: [

        { to: '/accounting/dashboard', icon: 'bi-graph-up', label: 'لوحة التحكم المالية' },

        { to: '/accounting/profitability', icon: 'bi-cash-coin', label: 'تحليل الأرباح الدقيق (Profitability)' },

        { to: '/accounting/chart-of-accounts', icon: 'bi-diagram-3', label: 'دليل وشجرة الحسابات' },

        { to: '/accounting/journal-entries', icon: 'bi-journal-check', label: 'قيود اليومية العامة' },

        { to: '/accounting/general-ledger', icon: 'bi-book', label: 'دفتر الأستاذ العام' },

        { to: '/accounting/expenses', icon: 'bi-wallet2', label: 'المصروفات والنفقات' },

        { to: '/accounting/reports', icon: 'bi-file-earmark-spreadsheet', label: 'القوائم المالية والتقارير' },

        { to: '/accounting/mappings', icon: 'bi-gear-wide-connected', label: 'إعدادات التوجيه المحاسبي' },

      ]

    },

    {

      id: 'hr',

      permission: 'sidebar.hr',

      title: 'الموارد البشرية والرواتب (HR & Payroll)',

      icon: 'bi-people-fill',

      links: [

        { to: '/hr/dashboard', icon: 'bi-speedometer', label: 'لوحة تحكم الموارد البشرية' },

        { to: '/hr/employees', icon: 'bi-person-badge', label: 'دليل وشؤون الموظفين' },

        { to: '/hr/attendance', icon: 'bi-clock-history', label: 'الحضور والانصراف والإجازات' },

        { to: '/hr/payroll', icon: 'bi-wallet2', label: 'مسير الرواتب والأجور' },

      ]

    },

    {

      id: 'admin',

      permission: 'sidebar.admin',

      title: 'الإدارة والإعدادات (Admin)',

      icon: 'bi-gear-wide-connected',

      links: [

        { to: '/branches', icon: 'bi-building', label: t('sidebar.branches') },

        { to: '/users', icon: 'bi-person-badge-fill', label: t('sidebar.users') },

        { to: '/roles', icon: 'bi-shield-lock-fill', label: t('sidebar.roles') },

        { to: '/audit-logs', icon: 'bi-journal-text', label: t('sidebar.auditLogs') },

        { to: '/settings', icon: 'bi-gear-fill', label: t('sidebar.settings') },

      ]

    }

  ];



  // Accordion state: open sections set

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({

    core: true,

    sales: true,

    crm: true,

    catalog: false,

    inventory: false,

    admin: false,

  });



  // Auto-expand section containing current active route

  useEffect(() => {

    sections.forEach(sec => {

      if (sec.links.some(l => l.to === location.pathname)) {

        setOpenSections(prev => ({ ...prev, [sec.id]: true }));

      }

    });

  }, [location.pathname]);



  const toggleSection = (sectionId: string) => {

    setOpenSections(prev => ({

      ...prev,

      [sectionId]: !prev[sectionId],

    }));

  };



  return (

    <div

      className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}

      style={{

        minHeight: '100vh',

        display: 'flex',

        flexDirection: 'column',

        transition: 'all 0.25s ease',

      }}

    >

      {/* Brand Header */}
      <div
        className="p-3 d-flex align-items-center justify-content-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        {!collapsed && (
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-bicycle text-primary fs-3"></i>
            <div>
              <div className="fs-5 fw-bold text-white tracking-wide" style={{ lineHeight: '1.1' }}>
                Helper
              </div>
              <div className="text-secondary small" style={{ fontSize: '0.65rem' }}>
                نظام إدارة معارض الدراجات
              </div>
            </div>
          </div>
        )}
        <div className="d-flex align-items-center gap-2">
          {!collapsed && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary p-1 d-flex align-items-center justify-content-center text-white border-secondary"
              onClick={() => setShowConfigModal(true)}
              title="إخفاء / إظهار الأقسام (تخصيص القائمة)"
              style={{ width: '28px', height: '28px', borderRadius: '6px' }}
            >
              <i className="bi bi-sliders fs-6" />
            </button>
          )}
          <i
            className="bi bi-list fs-4 text-white ms-1"
            style={{ cursor: 'pointer' }}
            onClick={() => setCollapsed(!collapsed)}
            title="طي / فتح القائمة"
          ></i>
        </div>
      </div>

      {/* Accordion Menu List */}
      <div className="flex-grow-1 overflow-auto py-2">
        {sections
          .filter(sec => {
            // Respect manual hide settings first
            if (hiddenSections.includes(sec.id)) return false;
            // If user has specific sidebar permissions defined in user object, check them
            if (sec.permission && user?.permissions && user.permissions.length > 0) {
              const hasAnySidebarPerm = user.permissions.some(p => p.startsWith('sidebar.'));
              // If user has sidebar permissions assigned, check if this specific one is included
              if (hasAnySidebarPerm) {
                return hasPermission(sec.permission);
              }
            }
            // Default: visible
            return true;
          })
          .map(sec => {
          const isOpen = !!openSections[sec.id];
          const hasActiveChild = sec.links.some(l => l.to === location.pathname);

          // If single link section (e.g. Dashboard)
          if (sec.links.length === 1) {
            const singleLink = sec.links[0];
            const active = location.pathname === singleLink.to;
            return (
              <div key={sec.id} className="mb-1">
                <Link
                  to={singleLink.to}
                  className={`d-flex align-items-center px-3 py-2 text-decoration-none transition-all ${
                    active ? 'sidebar-active text-white font-medium shadow-sm' : 'text-light opacity-75 hover-opacity-100'
                  }`}
                  style={{ borderRadius: '6px', margin: '2px 8px' }}
                >
                  <i className={`bi ${singleLink.icon} fs-5`}></i>
                  {!collapsed && <span className="ms-3 small fw-semibold">{sec.title}</span>}
                </Link>
              </div>
            );
          }

          return (
            <div key={sec.id} className="mb-1">
              {/* Accordion Dropdown Trigger */}
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className={`w-100 btn border-0 text-start d-flex align-items-center justify-content-between px-3 py-2 text-decoration-none transition-all ${
                  hasActiveChild
                    ? 'text-white fw-bold bg-white bg-opacity-10'
                    : 'text-light opacity-75 hover-opacity-100'
                }`}
                style={{
                  borderRadius: '6px',
                  margin: '2px 0',
                  boxShadow: 'none',
                }}
              >
                <div className="d-flex align-items-center">
                  <i className={`bi ${sec.icon} fs-5 text-secondary`}></i>
                  {!collapsed && (
                    <span className="ms-3 small fw-semibold" style={{ fontSize: '0.82rem' }}>
                      {sec.title}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <i
                    className={`bi bi-chevron-down small transition-all text-secondary ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      fontSize: '0.75rem',
                    }}
                  ></i>
                )}
              </button>

              {/* Submenu Items (Dropdown Body) */}
              {isOpen && !collapsed && (
                <div
                  className="ps-2 py-1 pe-1"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    borderRadius: '6px',
                    margin: '2px 8px',
                  }}
                >
                  {sec.links.map(l => {
                    const active = location.pathname === l.to;
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        className={`d-flex align-items-center px-3 py-1.5 text-decoration-none transition-all mb-1 ${
                          active
                            ? 'sidebar-active text-white font-medium shadow-sm'
                            : 'text-light opacity-75 hover-opacity-100'
                        }`}
                        style={{
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          paddingTop: '6px',
                          paddingBottom: '6px',
                        }}
                      >
                        <i className={`bi ${l.icon} me-2 fs-6`}></i>
                        <span>{l.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal to customize & toggle hide/show any section */}
      {showConfigModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}
          onClick={e => { if (e.target === e.currentTarget) setShowConfigModal(false); }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" dir="rtl">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-sliders me-2 text-warning" />
                  إظهار وإخفاء أقسام القائمة (Endpoints)
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowConfigModal(false)}
                />
              </div>
              <div className="modal-body p-3">
                <div className="alert alert-info py-2 small mb-3">
                  <i className="bi bi-info-circle me-1" />
                  جميع الأقسام ظاهرة افتراضياً (Default). يمكنك إلغاء تفعيل أي قسم ترغب في إخفائه (مثل الورشة أو HR):
                </div>

                <div className="list-group">
                  {sections.filter(s => s.id !== 'core').map(sec => {
                    const isVisible = !hiddenSections.includes(sec.id);
                    return (
                      <label
                        key={sec.id}
                        className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3"
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${sec.icon} fs-5 text-primary`} />
                          <div>
                            <span className="fw-semibold d-block">{sec.title}</span>
                            <span className="small text-muted">{sec.links.length} صفحات داخلية</span>
                          </div>
                        </div>
                        <div className="form-check form-switch m-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleHideSection(sec.id)}
                            style={{ cursor: 'pointer', width: '2.5em', height: '1.25em' }}
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer bg-light d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setHiddenSections([]);
                    localStorage.removeItem('sidebar_hidden_sections');
                  }}
                >
                  إعادة إظهار الكل (الافتراضي)
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4"
                  onClick={() => setShowConfigModal(false)}
                >
                  تم وحفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}