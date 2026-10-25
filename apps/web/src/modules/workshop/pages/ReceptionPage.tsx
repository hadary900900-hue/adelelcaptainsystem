import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function ReceptionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, activeBranchId } = useAuth();

  const [customerId, setCustomerId] = useState('');
  const [vehicleUnitId, setVehicleUnitId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [odometerReading, setOdometerReading] = useState<number | ''>('');
  const [fuelLevel, setFuelLevel] = useState('HALF');
  const [licensePlate, setLicensePlate] = useState('');
  const [complaint, setComplaint] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [accessories, setAccessories] = useState('');
  const [photos, setPhotos] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Add Modals state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Search filter states inside dropdowns
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Quick Customer Form State
  const [newCustForm, setNewCustForm] = useState({
    nameAr: '',
    nameEn: '',
    phone: '',
    nationalId: '',
    address: '',
  });

  // Quick Vehicle Form State
  const [newVehForm, setNewVehForm] = useState({
    productId: '',
    vin: '',
    engineNumber: '',
    color: '',
    modelYear: new Date().getFullYear(),
    licensePlate: '',
    mileage: 0,
  });

  // Fetch Customers with search
  const { data: customersData, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers-list-reception', customerSearch],
    queryFn: async () => {
      const res: any = await apiClient.get('/customers', {
        params: { search: customerSearch || undefined, limit: 100 }
      });
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Vehicles: When customer is selected, fetch ONLY vehicles belonging to this customer!
  // If no customer selected yet, or if user explicitly searches, fall back to branch inventory
  const { data: vehiclesData, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles-list-reception', customerId, activeBranchId, vehicleSearch],
    queryFn: async () => {
      if (customerId) {
        // Fetch vehicles specifically for this customer
        const res: any = await apiClient.get(`/workshop/customer/${customerId}/vehicles`);
        const list = res?.data?.data || res?.data || [];
        if (vehicleSearch) {
          const s = vehicleSearch.toLowerCase();
          return list.filter((v: any) => 
            v.vin?.toLowerCase().includes(s) ||
            v.engineNumber?.toLowerCase().includes(s) ||
            v.product?.nameAr?.toLowerCase().includes(s) ||
            v.product?.nameEn?.toLowerCase().includes(s) ||
            v.plateNumber?.toLowerCase().includes(s)
          );
        }
        return list;
      }
      
      // Fallback: If no customer chosen yet
      const res: any = await apiClient.get('/inventory/vehicles', {
        params: { 
          branchId: activeBranchId || undefined, 
          search: vehicleSearch || undefined,
          limit: 100 
        }
      });
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Vehicle Products for new vehicle modal
  const { data: vehicleProductsData } = useQuery({
    queryKey: ['products-vehicle-type-reception'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products', { params: { type: 'VEHICLE', limit: 100 } });
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch Warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list-reception', activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/warehouses');
      const list = res?.data?.data || res?.data || [];
      return activeBranchId ? list.filter((w: any) => w.branchId === activeBranchId) : list;
    },
  });

  // Fetch Technicians/Users
  const { data: usersData } = useQuery({
    queryKey: ['technicians-list-reception'],
    queryFn: async () => {
      const res: any = await apiClient.get('/users?limit=100');
      return res?.data?.data || res?.data || [];
    },
  });

  // Quick Customer Creation Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const customerCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
      const res: any = await apiClient.post('/customers', {
        ...payload,
        customerCode,
        type: 'INDIVIDUAL',
        priceTier: 'RETAIL',
        city: 'Cairo',
      });
      return res?.data?.data || res?.data;
    },
    onSuccess: (newCust: any) => {
      refetchCustomers();
      if (newCust?.id) {
        setCustomerId(newCust.id);
      }
      setShowAddCustomerModal(false);
      setNewCustForm({ nameAr: '', nameEn: '', phone: '', nationalId: '', address: '' });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل في حفظ العميل الجديد');
    }
  });

  // Quick Vehicle Creation Mutation
  const createVehicleMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Pick active branch and warehouse or first available
      const whId = warehouseId || warehousesData?.[0]?.id;
      const brId = activeBranchId || warehousesData?.[0]?.branchId;
      const res: any = await apiClient.post('/vehicles', {
        ...payload,
        branchId: brId,
        warehouseId: whId,
        status: 'AVAILABLE',
        purchaseCost: 0,
        sellingPrice: 0,
        b2bPrice: 0,
      });
      const createdVeh = res?.data?.data || res?.data;

      // Always explicitly link vehicle to this customer!
      if (customerId && createdVeh?.id) {
        await apiClient.post(`/workshop/customer/${customerId}/vehicles`, {
          vehicleUnitId: createdVeh.id,
          plateNumber: payload.licensePlate || null,
        });
      }

      return createdVeh;
    },
    onSuccess: async (newVeh: any) => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles-list-reception'] });
      await refetchVehicles();

      if (newVeh?.id) {
        setVehicleUnitId(newVeh.id);
        if (newVehForm.licensePlate) {
          setLicensePlate(newVehForm.licensePlate);
        }
        if (newVehForm.mileage) {
          setOdometerReading(newVehForm.mileage);
        }
      }
      setShowAddVehicleModal(false);
      setNewVehForm({
        productId: '',
        vin: '',
        engineNumber: '',
        color: '',
        modelYear: new Date().getFullYear(),
        licensePlate: '',
        mileage: 0,
      });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل في تسجيل المركبة الجديدة');
    }
  });

  // Selected vehicle details for odometer check
  const selectedVehicle = (vehiclesData || []).find((v: any) => v.id === vehicleUnitId);
  const previousMileage = selectedVehicle?.mileage || 0;

  const receptionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post('/workshop', payload);
      return res?.data?.data || res?.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      navigate(`/workshop/work-orders/${data.id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ أمر الاستقبال';
      setErrorMsg(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerId) return setErrorMsg('يرجى اختيار العميل');
    if (!vehicleUnitId) return setErrorMsg('يرجى اختيار دراجة/مركبة العميل');
    if (!warehouseId) return setErrorMsg('يرجى اختيار المستودع / ورشة العمل');
    if (odometerReading === '' || odometerReading < 0) return setErrorMsg('يرجى إدخال قراءة عداد الكيلومترات');

    if (Number(odometerReading) < previousMileage && !overrideReason.trim()) {
      return setErrorMsg(
        `قراءة العداد الحالية (${odometerReading} كم) أقل من المسجلة سابقاً (${previousMileage} كم). يرجى كتابة سبب التجاوز (Override Reason) للضرورة.`
      );
    }

    receptionMutation.mutate({
      branchId: activeBranchId || (selectedVehicle?.branchId) || '',
      warehouseId,
      customerId,
      vehicleUnitId,
      assignedTechnicianId: assignedTechnicianId || null,
      odometerReading: Number(odometerReading),
      fuelLevel,
      licensePlate,
      complaint,
      conditionNotes,
      accessories,
      photos: photos || null,
      overrideReason: overrideReason || null,
      notes: notes || null,
    });
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-box-arrow-in-down-right text-primary me-2"></i>
            استقبال مركبة جديدة وفتح أمر شغل (Vehicle Reception)
          </h3>
          <p className="text-muted mb-0">
            تسجيل بيانات الفحص والاستلام، التحقق من العداد السابق، وحفظ مقتنيات المركبة
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger shadow-sm d-flex align-items-center gap-2 mb-4">
          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          <div>{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Main Info */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent py-3 border-bottom">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="bi bi-person-badge text-primary me-2"></i>
                  بيانات العميل والمركبة
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {/* Customer Field with Quick Search and Add Button */}
                  <div className="col-md-6 position-relative">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label fw-semibold mb-0">العميل *</label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary py-0 px-2 d-flex align-items-center gap-1"
                        onClick={() => setShowAddCustomerModal(true)}
                        title="إضافة عميل جديد"
                      >
                        <i className="bi bi-person-plus-fill"></i>
                        <span>إضافة عميل جديد</span>
                      </button>
                    </div>

                    <div className="input-group mb-1">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-search text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="ابحث بالاسم أو الهاتف أو الكود..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                      {customerSearch && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setCustomerSearch('')}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>

                    {/* Instant Search Suggestions Box for Customers */}
                    {customerSearch.trim().length > 0 && (
                      <div
                        className="position-absolute bg-white border rounded shadow-lg w-100 z-3 overflow-auto"
                        style={{ maxHeight: '200px', top: '70px', left: 0 }}
                      >
                        {(customersData || []).length === 0 ? (
                          <div className="p-2 text-muted small text-center">لا توجد نتائج مطابقة</div>
                        ) : (
                          (customersData || []).map((c: any) => (
                            <div
                              key={c.id}
                              className="p-2 border-bottom cursor-pointer hover-bg-light d-flex justify-content-between align-items-center"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setCustomerId(c.id);
                                setVehicleUnitId(''); // reset vehicle when customer changes
                                setCustomerSearch('');
                              }}
                            >
                              <div>
                                <span className="fw-bold">{c.nameAr || c.nameEn}</span>
                                <div className="text-muted small">{c.phone} | كود: {c.customerCode}</div>
                              </div>
                              <span className="badge bg-primary">اختيار</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    <select
                      className="form-select"
                      value={customerId}
                      onChange={(e) => {
                        setCustomerId(e.target.value);
                        setVehicleUnitId(''); // reset vehicle unit when customer changes
                      }}
                      required
                    >
                      <option value="">-- اختر العميل من القائمة --</option>
                      {(customersData || []).map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr || c.nameEn} ({c.phone || c.customerCode})
                        </option>
                      ))}
                    </select>

                    {customerId && (
                      <div className="alert alert-success py-1 px-2 mt-1 mb-0 small d-flex justify-content-between align-items-center">
                        <div>
                          <i className="bi bi-check-circle-fill me-1"></i>
                          العميل المحدد: <strong>{(customersData || []).find((c: any) => c.id === customerId)?.nameAr || (customersData || []).find((c: any) => c.id === customerId)?.nameEn}</strong>
                        </div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-0"
                          onClick={() => {
                            setCustomerId('');
                            setVehicleUnitId('');
                          }}
                        >
                          تغيير
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Field with Quick Search and Add Button */}
                  <div className="col-md-6 position-relative">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label fw-semibold mb-0">
                        المركبة / الدراجة *
                        {customerId ? (
                          <span className="badge bg-success-subtle text-success ms-2">مركبات العميل فقط</span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning ms-2">اختر العميل أولاً</span>
                        )}
                      </label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary py-0 px-2 d-flex align-items-center gap-1"
                        onClick={() => setShowAddVehicleModal(true)}
                        title="تسجيل دراجة / مركبة جديدة للعميل"
                      >
                        <i className="bi bi-plus-circle-fill"></i>
                        <span>تسجيل مركبة جديدة</span>
                      </button>
                    </div>

                    <div className="input-group mb-1">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-search text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="ابحث برقم الشاسيه VIN أو الموديل أو الموتور..."
                        value={vehicleSearch}
                        onChange={(e) => setVehicleSearch(e.target.value)}
                        disabled={!customerId}
                      />
                      {vehicleSearch && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setVehicleSearch('')}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>

                    {/* Instant Search Suggestions Box for Vehicles */}
                    {customerId && vehicleSearch.trim().length > 0 && (
                      <div
                        className="position-absolute bg-white border rounded shadow-lg w-100 z-3 overflow-auto"
                        style={{ maxHeight: '200px', top: '70px', left: 0 }}
                      >
                        {(vehiclesData || []).length === 0 ? (
                          <div className="p-2 text-muted small text-center">لا توجد مركبات مسجلة باسم هذا العميل تطابق البحث</div>
                        ) : (
                          (vehiclesData || []).map((v: any) => (
                            <div
                              key={v.id}
                              className="p-2 border-bottom cursor-pointer hover-bg-light d-flex justify-content-between align-items-center"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setVehicleUnitId(v.id);
                                setOdometerReading(v.mileage || 0);
                                if (v.warehouseId) setWarehouseId(v.warehouseId);
                                if (v.plateNumber) setLicensePlate(v.plateNumber);
                                setVehicleSearch('');
                              }}
                            >
                              <div>
                                <span className="fw-bold">{v.product?.nameAr || v.product?.nameEn}</span>
                                <div className="text-muted small">
                                  VIN: <span className="font-monospace">{v.vin}</span> | موتور: {v.engineNumber}
                                  {v.plateNumber && ` | لوحة: ${v.plateNumber}`}
                                </div>
                              </div>
                              <span className="badge bg-success">اختيار</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    <select
                      className="form-select"
                      value={vehicleUnitId}
                      onChange={(e) => {
                        setVehicleUnitId(e.target.value);
                        const v = (vehiclesData || []).find((x: any) => x.id === e.target.value);
                        if (v) {
                          setOdometerReading(v.mileage || 0);
                          if (v.warehouseId) setWarehouseId(v.warehouseId);
                          if (v.plateNumber) setLicensePlate(v.plateNumber);
                        }
                      }}
                      disabled={!customerId}
                      required
                    >
                      <option value="">
                        {!customerId 
                          ? '-- يرجى اختيار العميل أولاً لعرض دراجاته --' 
                          : (vehiclesData || []).length === 0 
                            ? '-- لا توجد مركبات مسجلة باسم العميل (اضغط + تسجيل مركبة جديدة) --'
                            : '-- اختر مركبة العميل بالـ VIN --'}
                      </option>
                      {(vehiclesData || []).map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.product?.nameAr || v.product?.nameEn} | VIN: {v.vin} | موتور: {v.engineNumber} {v.plateNumber ? `(${v.plateNumber})` : ''}
                        </option>
                      ))}
                    </select>

                    {vehicleUnitId && (
                      <div className="alert alert-info py-1 px-2 mt-1 mb-0 small d-flex justify-content-between align-items-center">
                        <div>
                          <i className="bi bi-bicycle me-1"></i>
                          المركبة المحددة: <strong>{selectedVehicle?.product?.nameAr || selectedVehicle?.product?.nameEn}</strong> (VIN: {selectedVehicle?.vin})
                        </div>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-0"
                          onClick={() => setVehicleUnitId('')}
                        >
                          تغيير
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">مستودع / ورشة العمل *</label>
                    <select
                      className="form-select"
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      required
                    >
                      <option value="">-- اختر المستودع / الورشة --</option>
                      {(warehousesData || []).map((w: any) => (
                        <option key={w.id} value={w.id}>
                          {w.nameAr || w.nameEn} ({w.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">الفني المسؤول المبدئي (Technician)</label>
                    <select
                      className="form-select"
                      value={assignedTechnicianId}
                      onChange={(e) => setAssignedTechnicianId(e.target.value)}
                    >
                      <option value="">-- تعيين لاحقاً --</option>
                      {(usersData || []).map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.firstNameAr || u.firstNameEn} {u.lastNameAr || u.lastNameEn} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">رقم اللوحة (License Plate)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: ق ن ص 123"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      عداد الكيلومترات الحالي (KM) *
                      {previousMileage > 0 && (
                        <span className="badge bg-secondary ms-2">السابق: {previousMileage} كم</span>
                      )}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={odometerReading}
                      onChange={(e) => setOdometerReading(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">مستوى الوقود (Fuel Level)</label>
                    <select
                      className="form-select"
                      value={fuelLevel}
                      onChange={(e) => setFuelLevel(e.target.value)}
                    >
                      <option value="EMPTY">فارغ (Reserve/Empty)</option>
                      <option value="QUARTER">ربع التانك (1/4)</option>
                      <option value="HALF">نصف التانك (1/2)</option>
                      <option value="THREE_QUARTERS">ثلاثة أرباع (3/4)</option>
                      <option value="FULL">ممتلئ (Full)</option>
                    </select>
                  </div>

                  {Number(odometerReading) < previousMileage && (
                    <div className="col-12">
                      <div className="p-3 bg-warning bg-opacity-10 border border-warning rounded">
                        <label className="form-label fw-bold text-danger">
                          <i className="bi bi-shield-exclamation me-1"></i>
                          سبب التراجع في قراءة العداد (Override Reason) *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="مثال: تم تغيير لوحة العدادات تالفة أو تصحيح خطأ مدخل سابق..."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Complaint and Physical condition */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent py-3 border-bottom">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="bi bi-clipboard-pulse text-danger me-2"></i>
                  شكوى العميل وفحص حالة المركبة
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold">شكوى العميل والأعراض المشكو منها *</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="صف شكوى العميل بالتفصيل (مثل: صوت طقطقة في المساعد الخلفي، تأخير في الدوارة، تغيير زيت دوري...)"
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">ملاحظات الفحص الظاهري والخدوش السابقة</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="أي خدوش أو كسور مسبقة في الفبر أو الفانوس أو الشاسيه..."
                      value={conditionNotes}
                      onChange={(e) => setConditionNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">المتعلقات والإكسسوارات المستلمة</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="خوذة، رخصة تسيير، مفتاح إضافي، صندوق خلفي..."
                      value={accessories}
                      onChange={(e) => setAccessories(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Panel */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent py-3 border-bottom">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="bi bi-camera-fill text-info me-2"></i>
                  صور الاستلام والملاحظات
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">روابط صور الاستلام (Reception Photos)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="ضع روابط الصور أو مصفوفة JSON للصور الملتقطة..."
                    value={photos}
                    onChange={(e) => setPhotos(e.target.value)}
                  ></textarea>
                  <small className="text-muted">يمكن وضع روابط الصور الملتقطة بجهاز الاستقبال.</small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">ملاحظات إضافية</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="ملاحظات عامة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>

                <div className="d-grid gap-2 pt-2">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg fw-bold d-flex align-items-center justify-content-center gap-2"
                    disabled={receptionMutation.isPending}
                  >
                    {receptionMutation.isPending ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className="bi bi-check2-circle fs-5"></i>
                    )}
                    <span>إنشاء أمر الشغل والانتقال للمركز</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/workshop/work-orders')}
                  >
                    إلغاء والعودة
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Helper Notice */}
            <div className="card bg-info bg-opacity-10 border border-info shadow-none">
              <div className="card-body">
                <h6 className="fw-bold text-info mb-2">
                  <i className="bi bi-info-circle-fill me-1"></i>
                  قواعد عمل الورشة
                </h6>
                <ul className="small text-muted mb-0 ps-3">
                  <li>يتم ربط كل أمر شغل تلقائياً برقم فريد `WO-xxx`.</li>
                  <li>تتحول حالة المركبة إلى `IN_SERVICE` فور فتح الأمر.</li>
                  <li>يتم حفظ قراءة العداد في سجل غير قابل للتعديل.</li>
                  <li>يمكنك إضافة قطع الغيار وخدمات المصنعية في الخطوة التالية.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill me-2"></i>
                  إضافة عميل جديد سريع
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddCustomerModal(false)}
                ></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCustForm.nameAr && !newCustForm.nameEn) {
                    alert('يرجى إدخال اسم العميل');
                    return;
                  }
                  if (!newCustForm.phone) {
                    alert('يرجى إدخال رقم الهاتف');
                    return;
                  }
                  createCustomerMutation.mutate(newCustForm);
                }}
              >
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">اسم العميل بالعربي *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: محمد أحمد علي"
                      value={newCustForm.nameAr}
                      onChange={(e) => setNewCustForm({ ...newCustForm, nameAr: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">اسم العميل بالإنجليزية</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Mohamed Ahmed"
                      value={newCustForm.nameEn}
                      onChange={(e) => setNewCustForm({ ...newCustForm, nameEn: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">رقم الهاتف (موبايل) *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="01012345678"
                      value={newCustForm.phone}
                      onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">الرقم القومي (اختياري)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="14 رقم"
                      value={newCustForm.nationalId}
                      onChange={(e) => setNewCustForm({ ...newCustForm, nationalId: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">العنوان</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="العنوان أو المنطقة..."
                      value={newCustForm.address}
                      onChange={(e) => setNewCustForm({ ...newCustForm, address: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowAddCustomerModal(false)}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold"
                    disabled={createCustomerMutation.isPending}
                  >
                    {createCustomerMutation.isPending ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : null}
                    حفظ واختيار العميل
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-bicycle me-2"></i>
                  تسجيل دراجة / سكوتر جديد في النظام
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddVehicleModal(false)}
                ></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newVehForm.productId) {
                    alert('يرجى اختيار موديل / نوع المركبة من الكتالوج');
                    return;
                  }
                  if (!newVehForm.vin.trim()) {
                    alert('يرجى إدخال رقم الشاسيه VIN');
                    return;
                  }
                  if (!newVehForm.engineNumber.trim()) {
                    alert('يرجى إدخال رقم الموتور');
                    return;
                  }
                  createVehicleMutation.mutate(newVehForm);
                }}
              >
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label fw-semibold">نوع وموديل المركبة من الكتالوج *</label>
                      <select
                        className="form-select"
                        value={newVehForm.productId}
                        onChange={(e) => setNewVehForm({ ...newVehForm, productId: e.target.value })}
                        required
                      >
                        <option value="">-- اختر الموديل --</option>
                        {(vehicleProductsData || []).map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.nameAr || p.nameEn} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">رقم الشاسيه (VIN) *</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="مثال: LB4290..."
                        value={newVehForm.vin}
                        onChange={(e) => setNewVehForm({ ...newVehForm, vin: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">رقم الموتور (Engine No.) *</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="مثال: 1P52QMI..."
                        value={newVehForm.engineNumber}
                        onChange={(e) => setNewVehForm({ ...newVehForm, engineNumber: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">اللون</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="أحمر، أسود، أزرق..."
                        value={newVehForm.color}
                        onChange={(e) => setNewVehForm({ ...newVehForm, color: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">سنة الموديل</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newVehForm.modelYear}
                        onChange={(e) => setNewVehForm({ ...newVehForm, modelYear: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">رقم اللوحة</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="مثال: ق ن ص 123"
                        value={newVehForm.licensePlate}
                        onChange={(e) => setNewVehForm({ ...newVehForm, licensePlate: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">قراءة العداد الحالية (كم)</label>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        value={newVehForm.mileage}
                        onChange={(e) => setNewVehForm({ ...newVehForm, mileage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowAddVehicleModal(false)}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark fw-bold"
                    disabled={createVehicleMutation.isPending}
                  >
                    {createVehicleMutation.isPending ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : null}
                    تسجيل واختيار المركبة
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
