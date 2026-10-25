import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';

export default function HistoryPage() {
  const { type, id } = useParams<{ type: 'vehicle' | 'customer'; id: string }>();

  const isVehicle = type === 'vehicle';

  const { data, isLoading } = useQuery({
    queryKey: ['service-history', type, id],
    queryFn: async () => {
      const endpoint = isVehicle ? `/workshop/history/vehicle/${id}` : `/workshop/history/customer/${id}`;
      const res: any = await apiClient.get(endpoint);
      return res?.data?.data || res?.data;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const history = data.history || [];
  const entity = isVehicle ? data.vehicle : data.customer;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Link to="/workshop/work-orders" className="btn btn-sm btn-outline-secondary">
              <i className="bi bi-arrow-right"></i>
            </Link>
            <h3 className="fw-bold mb-0">
              {isVehicle ? (
                <>
                  سجل صيانة المركبة: <span className="text-primary">{entity?.product?.nameAr || entity?.product?.nameEn}</span>
                </>
              ) : (
                <>
                  سجل صيانة العميل: <span className="text-primary">{entity?.nameAr || entity?.nameEn}</span>
                </>
              )}
            </h3>
          </div>
          <p className="text-muted mb-0">
            {isVehicle
              ? `VIN: ${entity?.vin} | الموتور: ${entity?.engineNumber} | العداد التراكمي: ${entity?.mileage} كم`
              : `هاتف: ${entity?.phone} | الكود: ${entity?.customerCode}`}
          </p>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent py-3 border-bottom">
          <h5 className="card-title mb-0 fw-bold">
            <i className="bi bi-clock-history text-primary me-2"></i>
            سجل الزيارات وأوامر الصيانة السابقة ({history.length} زيارة)
          </h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">أمر الشغل</th>
                  <th>تاريخ الاستقبال</th>
                  <th>العداد عند الدخول</th>
                  <th>شكوى العميل</th>
                  <th>الحالة</th>
                  <th>قطع الغيار والخدمات</th>
                  <th>الفاتورة</th>
                  <th className="text-end pe-3">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      لا يوجد سجل زيارات أو صيانة سابق.
                    </td>
                  </tr>
                ) : (
                  history.map((h: any) => (
                    <tr key={h.id}>
                      <td className="ps-3 fw-bold text-primary">
                        <Link to={`/workshop/work-orders/${h.id}`} className="text-decoration-none">
                          {h.orderNumber}
                        </Link>
                      </td>
                      <td>{new Date(h.receptionDate || h.createdAt).toLocaleDateString('ar-EG')}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {h.odometerReading?.toLocaleString()} كم
                        </span>
                      </td>
                      <td>
                        <span className="small text-muted">{h.complaint || '—'}</span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{h.status}</span>
                      </td>
                      <td>
                        <div className="small">
                          {h.items?.length || 0} بنود (
                          {h.items?.map((i: any) => i.product?.nameAr || i.product?.nameEn).join(', ') || '—'}
                          )
                        </div>
                      </td>
                      <td>
                        {h.invoice ? (
                          <span className="badge bg-success">{h.invoice.invoiceNo}</span>
                        ) : (
                          <span className="text-muted small">غير مفوتر</span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <Link to={`/workshop/work-orders/${h.id}`} className="btn btn-sm btn-outline-primary">
                          عرض
                        </Link>
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
