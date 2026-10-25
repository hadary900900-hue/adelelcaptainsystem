import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';

// إشعار أسبوعي بالفواتير غير المسددة
export default function UnpaidInvoicesNotification() {
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // تحقق هل مر أسبوع من آخر إشعار
  const shouldShow = useCallback(() => {
    const lastShown = localStorage.getItem('unpaid-notif-last-shown');
    if (!lastShown) return true;
    const daysDiff = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
    return daysDiff >= 7;
  }, []);

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // أظهر الإشعار بعد 3 ثواني من فتح التطبيق
    const timer = setTimeout(() => {
      if (shouldShow()) setIsVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  const { data: unpaidSales } = useQuery({
    queryKey: ['unpaid-sales-invoices-notification'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/invoices', {
        params: { paymentStatus: 'UNPAID', limit: 50 },
      });
      const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return arr;
    },
    enabled: isVisible,
    staleTime: 1000 * 60 * 60, // cache لساعة
  });

  const { data: unpaidPurchase } = useQuery({
    queryKey: ['unpaid-purchase-invoices-notification'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/invoices', {
        params: { paymentStatus: 'UNPAID', limit: 50 },
      });
      const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return arr;
    },
    enabled: isVisible,
    staleTime: 1000 * 60 * 60,
  });

  const salesUnpaid = unpaidSales || [];
  const purchaseUnpaid = unpaidPurchase || [];
  const totalUnpaid = salesUnpaid.length + purchaseUnpaid.length;

  const salesTotal = salesUnpaid.reduce((s: number, inv: any) => s + (Number(inv.balanceDue) || 0), 0);
  const purchaseTotal = purchaseUnpaid.reduce((s: number, inv: any) => s + (Number(inv.balanceDue) || 0), 0);

  const handleDismiss = () => {
    localStorage.setItem('unpaid-notif-last-shown', Date.now().toString());
    setDismissed(true);
  };

  if (!isVisible || dismissed || totalUnpaid === 0) return null;

  return (
    <>
      {/* Overlay for details */}
      {showDetails && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 1040, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowDetails(false)}
        />
      )}

      {/* Toast Notification */}
      <div
        className="position-fixed animate-fade-in"
        style={{
          bottom: '1.5rem',
          left: '1.5rem',
          zIndex: 1050,
          maxWidth: '380px',
          width: 'calc(100vw - 3rem)',
        }}
        dir="rtl"
      >
        <div
          className="card border-0 shadow-lg"
          style={{
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
            color: '#fff',
          }}
        >
          {/* Header */}
          <div className="card-body pb-2 pt-3 px-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="d-flex align-items-center gap-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }}
                >
                  <i className="bi bi-bell-fill text-warning fs-6" />
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: '0.88rem' }}>تنبيه: فواتير غير مسددة</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>تذكير أسبوعي تلقائي</div>
                </div>
              </div>
              <button
                className="btn-close btn-close-white"
                style={{ transform: 'scale(0.7)' }}
                onClick={handleDismiss}
              />
            </div>

            {/* Summary */}
            <div className="d-flex gap-2 mb-2">
              {salesUnpaid.length > 0 && (
                <div
                  className="flex-1 rounded-3 p-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.1)', flex: 1 }}
                >
                  <div className="fw-bold" style={{ fontSize: '1.1rem', color: '#FCD34D' }}>
                    {salesUnpaid.length}
                  </div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>فاتورة مبيعات</div>
                  <div style={{ fontSize: '0.7rem', color: '#FCA5A5' }}>
                    {salesTotal.toLocaleString()} ج.م
                  </div>
                </div>
              )}
              {purchaseUnpaid.length > 0 && (
                <div
                  className="flex-1 rounded-3 p-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.1)', flex: 1 }}
                >
                  <div className="fw-bold" style={{ fontSize: '1.1rem', color: '#FCD34D' }}>
                    {purchaseUnpaid.length}
                  </div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>فاتورة مشتريات</div>
                  <div style={{ fontSize: '0.7rem', color: '#FCA5A5' }}>
                    {purchaseTotal.toLocaleString()} ج.م
                  </div>
                </div>
              )}
            </div>

            <div className="text-center mb-2" style={{ fontSize: '0.7rem', opacity: 0.6 }}>
              إجمالي المبالغ المستحقة: <strong style={{ color: '#FCD34D' }}>{(salesTotal + purchaseTotal).toLocaleString()} ج.م</strong>
            </div>

            {/* Actions */}
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm flex-fill"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.78rem', borderRadius: 8 }}
                onClick={() => setShowDetails(!showDetails)}
              >
                <i className="bi bi-list-ul me-1" />
                التفاصيل
              </button>
              {salesUnpaid.length > 0 && (
                <Link
                  to="/sales/invoices"
                  className="btn btn-sm flex-fill"
                  style={{ background: '#2563EB', color: '#fff', fontSize: '0.78rem', borderRadius: 8 }}
                  onClick={handleDismiss}
                >
                  <i className="bi bi-receipt me-1" />
                  المبيعات
                </Link>
              )}
              {purchaseUnpaid.length > 0 && (
                <Link
                  to="/purchasing/invoices"
                  className="btn btn-sm flex-fill"
                  style={{ background: '#059669', color: '#fff', fontSize: '0.78rem', borderRadius: 8 }}
                  onClick={handleDismiss}
                >
                  <i className="bi bi-bag me-1" />
                  المشتريات
                </Link>
              )}
            </div>
          </div>

          {/* Details Panel */}
          {showDetails && (
            <div
              className="card-footer p-2"
              style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '0 0 16px 16px',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {salesUnpaid.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="d-flex justify-content-between py-1" style={{ fontSize: '0.73rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="font-monospace" style={{ color: '#93C5FD' }}>{inv.invoiceNo}</span>
                  <span style={{ opacity: 0.8 }}>{inv.customer?.nameAr || 'عميل'}</span>
                  <span style={{ color: '#FCA5A5', fontWeight: 600 }}>{Number(inv.balanceDue).toLocaleString()} ج.م</span>
                </div>
              ))}
              {purchaseUnpaid.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="d-flex justify-content-between py-1" style={{ fontSize: '0.73rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="font-monospace" style={{ color: '#6EE7B7' }}>{inv.invoiceNo}</span>
                  <span style={{ opacity: 0.8 }}>{inv.supplier?.nameAr || 'مورد'}</span>
                  <span style={{ color: '#FCA5A5', fontWeight: 600 }}>{Number(inv.balanceDue).toLocaleString()} ج.م</span>
                </div>
              ))}
              {totalUnpaid > 10 && (
                <div className="text-center pt-1" style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                  + {totalUnpaid - 10} فاتورة أخرى...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
