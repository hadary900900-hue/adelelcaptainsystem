import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function WorkOrdersPage() {
  const { activeBranchId } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['work-orders-list', search, statusFilter, startDate, endDate, activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/workshop', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          branchId: activeBranchId || undefined,
          limit: 100,
        },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  const orders = ordersData || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="badge bg-secondary">مستلم (Received)</span>;
      case 'DIAGNOSING':
        return <span className="badge bg-info text-dark">قيد الفحص (Diagnosing)</span>;
      case 'AWAITING_APPROVAL':
        return <span className="badge bg-warning text-dark">في انتظار موافقة العميل</span>;
      case 'APPROVED':
        return <span className="badge bg-primary">معتمد (Approved)</span>;
      case 'IN_PROGRESS':
        return <span className="badge bg-primary">قيد الصيانة (In Progress)</span>;
      case 'WAITING_FOR_PARTS':
        return <span className="badge bg-danger">انتظار قطع الغيار</span>;
      case 'COMPLETED':
        return <span className="badge bg-success">تمت الصيانة (Completed)</span>;
      case 'INVOICED':
        return <span className="badge bg-purple text-white" style={{ backgroundColor: '#7c3aed' }}>تمت الفوترة (Invoiced)</span>;
      case 'DELIVERED':
        return <span className="badge bg-success">تم تسليم المركبة (Delivered)</span>;
      case 'CANCELLED':
        return <span className="badge bg-dark">ملغي (Cancelled)</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-wrench-adjustable text-primary me-2"></i>
            أوامر الشغل والصيانة (Work Orders)
          </h3>
          <p className="text-muted mb-0">متابعة صيانة دراجات وسكوترات العملاء وقطع الغيار المصروفة والفواتير</p>
        </div>
        <Link
          to="/workshop/reception"
          className="btn btn-primary d-flex align-items-center gap-2 fw-bold shadow-sm"
        >
          <i className="bi bi-plus-circle-fill"></i>
          <span>استقبال مركبة جديدة</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="بحث برقم أمر الشغل، اللوحة، الـ VIN، اسم أو هاتف العميل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">جميع الحالات</option>
                <option value="RECEIVED">مستلم (Received)</option>
                <option value="DIAGNOSING">قيد الفحص (Diagnosing)</option>
                <option value="AWAITING_APPROVAL">في انتظار موافقة العميل</option>
                <option value="APPROVED">معتمد (Approved)</option>
                <option value="IN_PROGRESS">قيد العمل (In Progress)</option>
                <option value="WAITING_FOR_PARTS">انتظار قطع غيار</option>
                <option value="COMPLETED">منتهي (Completed)</option>
                <option value="INVOICED">مفوتر (Invoiced)</option>
                <option value="DELIVERED">تم التسليم (Delivered)</option>
                <option value="CANCELLED">ملغي (Cancelled)</option>
              </select>
            </div>
            <div className="col-md-2">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light">من</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="من تاريخ"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light">إلى</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="إلى تاريخ"
                />
              </div>
            </div>
            <div className="col-md-2 d-grid">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">رقم أمر الشغل</th>
                  <th>العميل</th>
                  <th>المركبة / VIN</th>
                  <th>اللوحة</th>
                  <th>العداد (KM)</th>
                  <th>الحالة</th>
                  <th>الفني</th>
                  <th>تاريخ الاستقبال</th>
                  <th className="text-end pe-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                      لا توجد أوامر شغل مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  orders.map((wo: any) => (
                    <tr key={wo.id}>
                      <td className="ps-3 fw-bold text-primary">
                        <Link to={`/workshop/work-orders/${wo.id}`} className="text-decoration-none">
                          {wo.orderNumber}
                        </Link>
                      </td>
                      <td>
                        <div className="fw-semibold">{wo.customer?.nameAr || wo.customer?.nameEn}</div>
                        <small className="text-muted">{wo.customer?.phone}</small>
                      </td>
                      <td>
                        <div>{wo.vehicleUnit?.product?.nameAr || wo.vehicleUnit?.product?.nameEn}</div>
                        <small className="text-muted font-monospace">{wo.vehicleUnit?.vin}</small>
                      </td>
                      <td>{wo.licensePlate || '—'}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {wo.odometerReading?.toLocaleString()} كم
                        </span>
                      </td>
                      <td>{getStatusBadge(wo.status)}</td>
                      <td>
                        {wo.assignedTechnician ? (
                          <span className="small fw-semibold">
                            {wo.assignedTechnician.firstNameEn} {wo.assignedTechnician.lastNameEn}
                          </span>
                        ) : (
                          <span className="text-muted small">غير معين</span>
                        )}
                      </td>
                      <td>
                        <span className="small text-muted">
                          {new Date(wo.receptionDate || wo.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </td>
                      <td className="text-end pe-3">
                        <Link
                          to={`/workshop/work-orders/${wo.id}`}
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                        >
                          <i className="bi bi-pencil-square"></i>
                          <span>إدارة الأمر</span>
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
