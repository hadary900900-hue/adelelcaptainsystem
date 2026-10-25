import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import { Link } from 'react-router-dom';

export default function PurchasingDashboardPage() {
  const { activeBranchId } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['purchasing-dashboard', activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/dashboard', {
        params: { branchId: activeBranchId || undefined }
      });
      return res?.data?.data || res?.data;
    }
  });

  const stats = dashboardData || {
    suppliersCount: 0,
    pendingOrdersCount: 0,
    totalPurchases: 0,
    totalPaidToSuppliers: 0,
    totalAccountsPayable: 0,
    recentInvoices: [],
    recentReceipts: [],
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">لوحة تحكم المشتريات والموردين (Purchasing)</h3>
          <p className="text-muted mb-0">نظرة عامة على دورة المشتريات، أرصدة الموردين، وإذونات استلام البضاعة</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/purchasing/goods-receipts" className="btn btn-outline-primary">
            <i className="bi bi-box-arrow-in-down me-1"></i> استلام بضاعة واردة
          </Link>
          <Link to="/purchasing/orders" className="btn btn-primary">
            <i className="bi bi-plus-circle me-1"></i> أمر شراء جديد
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-primary border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">إجمالي المشتريات</span>
                <div className="bg-primary-subtle text-primary p-2 rounded">
                  <i className="bi bi-bag-check fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-1 font-monospace">
                {isLoading ? '...' : (stats.totalPurchases || 0).toLocaleString()} <small className="fs-6">ج.م</small>
              </h4>
              <span className="text-muted small">قيمة جميع فواتير الشراء</span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-danger border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">حسابات الموردين المستحقة (AP)</span>
                <div className="bg-danger-subtle text-danger p-2 rounded">
                  <i className="bi bi-cash-stack fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-danger mb-1 font-monospace">
                {isLoading ? '...' : (stats.totalAccountsPayable || 0).toLocaleString()} <small className="fs-6">ج.م</small>
              </h4>
              <span className="text-muted small">مستحقات للموردين واجبة السداد</span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">المسدد للموردين</span>
                <div className="bg-success-subtle text-success p-2 rounded">
                  <i className="bi bi-check2-circle fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-success mb-1 font-monospace">
                {isLoading ? '...' : (stats.totalPaidToSuppliers || 0).toLocaleString()} <small className="fs-6">ج.م</small>
              </h4>
              <span className="text-muted small">إجمالي الدفعات المسجلة</span>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm border-start border-warning border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-bold">أوامر شراء معلقة</span>
                <div className="bg-warning-subtle text-warning p-2 rounded">
                  <i className="bi bi-clock-history fs-5"></i>
                </div>
              </div>
              <h4 className="fw-bold text-dark mb-1 font-monospace">
                {isLoading ? '...' : stats.pendingOrdersCount} <small className="fs-6">أمر</small>
              </h4>
              <span className="text-muted small">بانتظار الاستلام والفحص</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links & Shortcuts */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h6 className="mb-0 fw-bold">دورة المشتريات والمخازن المتكاملة (Purchase Workflow)</h6>
        </div>
        <div className="card-body">
          <div className="row g-3 text-center">
            <div className="col-md-2 col-4">
              <Link to="/purchasing/quotations" className="text-decoration-none">
                <div className="p-3 border rounded hover-shadow bg-light">
                  <i className="bi bi-file-earmark-spreadsheet text-primary fs-3 d-block mb-2"></i>
                  <div className="fw-bold text-dark small">عروض الأسعار</div>
                  <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Quotations</div>
                </div>
              </Link>
            </div>
            <div className="col-md-2 col-4">
              <Link to="/purchasing/orders" className="text-decoration-none">
                <div className="p-3 border rounded hover-shadow bg-light">
                  <i className="bi bi-cart-check text-info fs-3 d-block mb-2"></i>
                  <div className="fw-bold text-dark small">أوامر الشراء</div>
                  <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Purchase Orders</div>
                </div>
              </Link>
            </div>
            <div className="col-md-2 col-4">
              <Link to="/purchasing/goods-receipts" className="text-decoration-none">
                <div className="p-3 border rounded hover-shadow bg-light">
                  <i className="bi bi-box-arrow-in-down text-success fs-3 d-block mb-2"></i>
                  <div className="fw-bold text-dark small">إذونات الاستلام</div>
                  <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Goods Receipt</div>
                </div>
              </Link>
            </div>
            <div className="col-md-2 col-4">
              <Link to="/purchasing/invoices" className="text-decoration-none">
                <div className="p-3 border rounded hover-shadow bg-light">
                  <i className="bi bi-receipt-cutoff text-warning fs-3 d-block mb-2"></i>
                  <div className="fw-bold text-dark small">فواتير الشراء</div>
                  <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Purchase Invoices</div>
                </div>
              </Link>
            </div>
            <div className="col-md-2 col-4">
              <Link to="/purchasing/returns" className="text-decoration-none">
                <div className="p-3 border rounded hover-shadow bg-light">
                  <i className="bi bi-arrow-return-left text-danger fs-3 d-block mb-2"></i>
                  <div className="fw-bold text-dark small">مرتجع المشتريات</div>
                  <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Purchase Returns</div>
                </div>
              </Link>
            </div>
            <div className="col-md-2 col-4">
              <Link to="/purchasing/suppliers" className="text-decoration-none">
                <div className="p-3 border rounded hover-shadow bg-light">
                  <i className="bi bi-truck text-dark fs-3 d-block mb-2"></i>
                  <div className="fw-bold text-dark small">دليل الموردين</div>
                  <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Suppliers & Ledgers</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tables: Recent Invoices & Recent Goods Receipts */}
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">آخر فواتير المشتريات</h6>
              <Link to="/purchasing/invoices" className="btn btn-sm btn-link text-decoration-none">عرض الكل</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.85rem' }}>
                  <thead className="table-light">
                    <tr>
                      <th>رقم الفاتورة</th>
                      <th>المورد</th>
                      <th>التاريخ</th>
                      <th>الإجمالي</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recentInvoices || []).length === 0 ? (
                      <tr><td colSpan={5} className="py-4 text-muted">لا توجد فواتير شراء حتى الآن</td></tr>
                    ) : (
                      (stats.recentInvoices || []).map((inv: any) => (
                        <tr key={inv.id}>
                          <td className="fw-bold text-primary font-monospace">{inv.invoiceNo}</td>
                          <td>{inv.supplier?.nameAr || inv.supplier?.nameEn}</td>
                          <td>{new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}</td>
                          <td className="font-monospace fw-bold">{inv.grandTotal.toFixed(2)} ج.م</td>
                          <td>
                            <span className={`badge ${inv.paymentStatus === 'PAID' ? 'bg-success' : inv.paymentStatus === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                              {inv.paymentStatus === 'PAID' ? 'مسددة' : inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مسددة'}
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

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">آخر إذونات استلام البضاعة (وارد المخزن)</h6>
              <Link to="/purchasing/goods-receipts" className="btn btn-sm btn-link text-decoration-none">عرض الكل</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.85rem' }}>
                  <thead className="table-light">
                    <tr>
                      <th>رقم الإذن</th>
                      <th>المورد</th>
                      <th>المستودع</th>
                      <th>التاريخ</th>
                      <th>عدد الأصناف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.recentReceipts || []).length === 0 ? (
                      <tr><td colSpan={5} className="py-4 text-muted">لا توجد إذونات استلام مسجلة حتى الآن</td></tr>
                    ) : (
                      (stats.recentReceipts || []).map((gr: any) => (
                        <tr key={gr.id}>
                          <td className="fw-bold text-success font-monospace">{gr.receiptNo}</td>
                          <td>{gr.supplier?.nameAr || gr.supplier?.nameEn}</td>
                          <td>{gr.warehouse?.nameAr || gr.warehouse?.nameEn}</td>
                          <td>{new Date(gr.receiptDate).toLocaleDateString('ar-EG')}</td>
                          <td><span className="badge bg-secondary">{gr.items?.length || 0} صنف</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
