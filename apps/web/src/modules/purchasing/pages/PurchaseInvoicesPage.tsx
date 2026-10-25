import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function PurchaseInvoicesPage() {
  const location = useLocation();
  const { activeBranchId } = useAuth();
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // Form State
  const [form, setForm] = useState({
    supplierInvoiceNo: '',
    supplierId: '',
    warehouseId: '',
    branchId: '',
    goodsReceiptId: '',
    purchaseOrderId: '',
    dueDate: '',
    discountTotal: 0,
    taxRate: 14,
    paidAmount: 0,
    paymentMethod: 'CASH',
    paymentRef: '',
    notes: '',
  });

  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Payment Form
  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    referenceNo: '',
    notes: '',
  });

  // Queries
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list-inv'],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/suppliers?limit=100');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-list-inv'],
    queryFn: async () => {
      const res: any = await apiClient.get('/warehouses');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list-for-pinv'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=200');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['purchase-invoices-list', search, supplierId, paymentStatus, activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/purchasing/invoices', {
        params: {
          search: search || undefined,
          supplierId: supplierId || undefined,
          paymentStatus: paymentStatus || undefined,
          branchId: activeBranchId || undefined,
          limit: 100,
        },
      });
      return res?.data?.data || res?.data || [];
    },
  });

  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/purchasing/invoices', payload);
    },
    onSuccess: () => {
      alert('تم إنشاء فاتورة الشراء وتحديث حساب المورد بنجاح');
      setShowAddModal(false);
      setInvoiceItems([]);
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل حفظ فاتورة الشراء');
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return apiClient.put(`/purchasing/invoices/${id}`, payload);
    },
    onSuccess: () => {
      alert('تم تعديل فاتورة الشراء وتحديث الحسابات بنجاح');
      setEditingInvoice(null);
      setSelectedInvoice(null);
      setInvoiceItems([]);
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل تعديل فاتورة الشراء');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/purchasing/payments', payload);
    },
    onSuccess: () => {
      alert('تم تسجيل دفعة السداد وتحديث رصيد المورد بنجاح');
      setShowPaymentModal(null);
      if (selectedInvoice) {
        apiClient.get(`/purchasing/invoices/${selectedInvoice.id}`).then((res: any) => {
          setSelectedInvoice(res?.data?.data || res?.data);
        }).catch(() => {});
      }
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل تسجيل الدفعة');
    },
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return apiClient.delete(`/purchasing/payments/${paymentId}`);
    },
    onSuccess: () => {
      alert('تم إلغاء عملية السداد واسترجاع الرصيد بنجاح');
      if (selectedInvoice) {
        apiClient.get(`/purchasing/invoices/${selectedInvoice.id}`).then((res: any) => {
          setSelectedInvoice(res?.data?.data || res?.data);
        }).catch(() => {});
      }
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل إلغاء السداد');
    },
  });

  // Handle automatic conversion from Goods Receipt if navigated with state
  useEffect(() => {
    const gr = (location.state as any)?.convertFromGR;
    if (gr && warehousesData?.length) {
      const defaultWh = gr.warehouseId || warehousesData[0]?.id || '';
      const defaultBr = gr.branchId || activeBranchId || warehousesData[0]?.branchId || '';
      
      setForm({
        supplierInvoiceNo: gr.receiptNo ? `INV-${gr.receiptNo}` : '',
        supplierId: gr.supplierId || '',
        warehouseId: defaultWh,
        branchId: defaultBr,
        goodsReceiptId: gr.id || '',
        purchaseOrderId: gr.purchaseOrderId || '',
        dueDate: '',
        discountTotal: 0,
        taxRate: 14,
        paidAmount: 0,
        paymentMethod: 'CASH',
        paymentRef: '',
        notes: `فاتورة شراء مبنية على إذن الاستلام رقم: ${gr.receiptNo}`,
      });

      const items = (gr.items || []).map((it: any) => ({
        productId: it.productId,
        productName: it.product?.nameAr || it.product?.nameEn || 'صنف',
        sku: it.product?.sku || '',
        quantity: it.quantity || 1,
        unitCost: it.unitCost || 0,
        discount: 0,
        taxRate: 14,
      }));

      setInvoiceItems(items);
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, warehousesData]);

  const handleOpenAdd = () => {
    const defaultWh = warehousesData?.[0]?.id || '';
    const defaultBr = activeBranchId || warehousesData?.[0]?.branchId || '';
    setForm({
      supplierInvoiceNo: '',
      supplierId: suppliersData?.[0]?.id || '',
      warehouseId: defaultWh,
      branchId: defaultBr,
      dueDate: '',
      discountTotal: 0,
      taxRate: 14,
      paidAmount: 0,
      paymentMethod: 'CASH',
      paymentRef: '',
      notes: '',
    });
    setInvoiceItems([]);
    setShowAddModal(true);
  };

  const handleOpenEdit = (inv: any) => {
    setEditingInvoice(inv);
    setForm({
      supplierInvoiceNo: inv.supplierInvoiceNo || '',
      supplierId: inv.supplierId,
      warehouseId: inv.warehouseId,
      branchId: inv.branchId,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      discountTotal: inv.discountTotal || 0,
      taxRate: inv.taxRate !== undefined ? inv.taxRate : 14,
      paidAmount: inv.paidAmount || 0,
      paymentMethod: 'CASH',
      paymentRef: '',
      notes: inv.notes || '',
    });
    setInvoiceItems(
      (inv.items || []).map((it: any) => ({
        productId: it.productId,
        productName: it.product?.nameAr || it.product?.nameEn || 'منتج',
        sku: it.product?.sku || '',
        quantity: it.quantity,
        unitCost: it.unitCost,
        discount: it.discount || 0,
        taxRate: it.taxRate !== undefined ? it.taxRate : 14,
      }))
    );
  };

  const handleAddProduct = (prod: any) => {
    if (!prod) return;
    setInvoiceItems([
      ...invoiceItems,
      {
        productId: prod.id,
        productName: prod.nameAr || prod.nameEn,
        sku: prod.sku,
        quantity: 1,
        unitCost: prod.costPrice || 0,
        discount: 0,
        taxRate: 14,
      },
    ]);
    setProductSearch('');
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const list = [...invoiceItems];
    list[index][field] = value;
    setInvoiceItems(list);
  };

  const handleRemoveItem = (index: number) => {
    const list = [...invoiceItems];
    list.splice(index, 1);
    setInvoiceItems(list);
  };

  const [showMultiViewModal, setShowMultiViewModal] = useState(false);

  // Column Filters State for Purchase Invoices
  const [colFilters, setColFilters] = useState({
    invoiceNo: '',
    supplierInvoiceNo: '',
    supplier: '',
    status: '',
  });

  // Multi-format Export Utility for Purchase Invoices (PDF, EXCEL, CSV, JSON, TXT)
  const handleExportFormat = (targetInvoices: any[], format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'TXT') => {
    if (!targetInvoices || targetInvoices.length === 0) {
      alert('يرجى تحديد فاتورة واحدة على الأقل');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];

    // Export as PDF via Clean Native Print Preview / PDF Engine
    if (format === 'PDF') {
      const sumGrand = targetInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const sumPaid = targetInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
      const sumDue = targetInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const rowsHtml = targetInvoices.map((inv, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: bold; font-family: monospace;">${inv.invoiceNo}</td>
          <td style="font-family: monospace;">${inv.supplierInvoiceNo || '—'}</td>
          <td>${inv.supplier?.nameAr || inv.supplier?.nameEn || '—'}</td>
          <td>${new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}</td>
          <td style="text-align: left; font-weight: bold;">${(Number(inv.grandTotal) || 0).toLocaleString()} ج.م</td>
          <td style="text-align: left; color: #198754;">${(Number(inv.paidAmount) || 0).toLocaleString()} ج.م</td>
          <td style="text-align: left; color: #dc3545; font-weight: bold;">${(Number(inv.balanceDue) || 0).toLocaleString()} ج.م</td>
          <td style="text-align: center;">${inv.paymentStatus === 'PAID' ? 'مسددة' : inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مسددة'}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>تقرير فواتير المشتريات - ${timestamp}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 15px; color: #333; direction: rtl; }
            .header { text-align: center; border-bottom: 2px solid #0d6efd; padding-bottom: 12px; margin-bottom: 15px; }
            .header h2 { margin: 0 0 5px 0; color: #0d6efd; font-size: 20px; }
            .header p { margin: 0; font-size: 12px; color: #666; }
            .meta-boxes { display: flex; justify-content: space-between; margin-bottom: 15px; gap: 15px; }
            .box { flex: 1; border: 1px solid #dee2e6; border-radius: 6px; padding: 10px; background: #f8f9fa; text-align: center; }
            .box .title { font-size: 12px; color: #666; margin-bottom: 4px; }
            .box .val { font-size: 16px; font-weight: bold; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th { background: #f1f4f9; color: #333; padding: 6px 8px; border: 1px solid #dee2e6; text-align: right; }
            td { padding: 6px 8px; border: 1px solid #dee2e6; }
            tfoot td { font-weight: bold; background: #f8f9fa; border-top: 2px solid #0d6efd; }
            .footer { margin-top: 25px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>تقرير فواتير المشتريات وحسابات الموردين (AP)</h2>
            <p>تاريخ استخراج التقرير: ${new Date().toLocaleDateString('ar-EG')} • العدد الإجمالي: ${targetInvoices.length} فاتورة</p>
          </div>

          <div class="meta-boxes">
            <div class="box">
              <div class="title">إجمالي المشتريات</div>
              <div class="val" style="color: #0d6efd;">${sumGrand.toLocaleString()} ج.م</div>
            </div>
            <div class="box">
              <div class="title">إجمالي المسدد للموردين</div>
              <div class="val" style="color: #198754;">${sumPaid.toLocaleString()} ج.م</div>
            </div>
            <div class="box">
              <div class="title">إجمالي المتبقي (الذمم الدائنة)</div>
              <div class="val" style="color: #dc3545;">${sumDue.toLocaleString()} ج.م</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>رقم الفاتورة</th>
                <th>فاتورة المورد</th>
                <th>المورد</th>
                <th style="text-align: center;">التاريخ</th>
                <th style="text-align: left;">الإجمالي</th>
                <th style="text-align: left;">المدفوع</th>
                <th style="text-align: left;">المتبقي المطلوب</th>
                <th style="text-align: center;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align: right;">المجموع الإجمالي للفواتير المحددة:</td>
                <td style="text-align: left; font-family: monospace;">${sumGrand.toLocaleString()} ج.م</td>
                <td style="text-align: left; color: #198754; font-family: monospace;">${sumPaid.toLocaleString()} ج.م</td>
                <td style="text-align: left; color: #dc3545; font-family: monospace;">${sumDue.toLocaleString()} ج.م</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            تم استخراج التقرير آلياً • لحفظ التقرير بصيغة PDF اختر الوجهة (Save as PDF) من نافذة الطباعة
          </div>
        </body>
        </html>
      `;

      const printWin = window.open('', '_blank', 'width=1100,height=800');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 400);
      } else {
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
        const doc = printFrame.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(printFrame);
            }, 1500);
          }, 400);
        }
      }
      return;
    }

    if (format === 'JSON') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targetInvoices, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Purchase_Invoices_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    if (format === 'TXT') {
      let txt = `====================================================\n`;
      txt += `تقرير فواتير المشتريات - صادرة بتاريخ ${new Date().toLocaleDateString('ar-EG')}\n`;
      txt += `العدد الإجمالي للفواتير: ${targetInvoices.length}\n`;
      txt += `====================================================\n\n`;

      targetInvoices.forEach((inv, i) => {
        txt += `${i + 1}. فاتورة شراء رقم: ${inv.invoiceNo} (فاتورة المورد: ${inv.supplierInvoiceNo || '—'})\n`;
        txt += `   المورد: ${inv.supplier?.nameAr || inv.supplier?.nameEn}\n`;
        txt += `   التاريخ: ${new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}\n`;
        txt += `   الإجمالي: ${inv.grandTotal?.toFixed(2)} ج.م | المسدد: ${inv.paidAmount?.toFixed(2)} ج.م | المتبقي للمورد: ${inv.balanceDue?.toFixed(2)} ج.م\n`;
        txt += `   الحالة: ${inv.paymentStatus === 'PAID' ? 'مسددة' : inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مسددة'}\n`;
        txt += `----------------------------------------------------\n`;
      });

      const totalGrand = targetInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const totalPaid = targetInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
      const totalDue = targetInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);
      txt += `\nإجمالي مبالغ المشتريات: ${totalGrand.toFixed(2)} ج.م\n`;
      txt += `إجمالي المسدد للموردين: ${totalPaid.toFixed(2)} ج.م\n`;
      txt += `إجمالي الذمم الدائنة المتبقية: ${totalDue.toFixed(2)} ج.م\n`;

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Purchase_Invoices_${timestamp}.txt`;
      link.click();
      return;
    }

    // CSV & EXCEL
    let csv = '\uFEFF';
    csv += 'رقم الفاتورة,فاتورة المورد,المورد,الهاتف,التاريخ,المجموع الفرعي,الخصم,الضريبة,الإجمالي النهائي,المدفوع,المتبقي المطلوب,حالة السداد\n';

    targetInvoices.forEach((inv: any) => {
      const suppName = (inv.supplier?.nameAr || inv.supplier?.nameEn || '').replace(/,/g, ' ');
      csv += `"${inv.invoiceNo}","${inv.supplierInvoiceNo || ''}","${suppName}","${inv.supplier?.phone || ''}","${new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}",${inv.subtotal || 0},${inv.discountTotal || 0},${inv.taxAmount || 0},${inv.grandTotal || 0},${inv.paidAmount || 0},${inv.balanceDue || 0},"${inv.paymentStatus}"\n`;
    });

    const totalSub = targetInvoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0);
    const totalDisc = targetInvoices.reduce((sum, inv) => sum + (Number(inv.discountTotal) || 0), 0);
    const totalTax = targetInvoices.reduce((sum, inv) => sum + (Number(inv.taxAmount) || 0), 0);
    const totalGrand = targetInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalPaid = targetInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
    const totalDue = targetInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);

    csv += `\n"الإجمالي الكلي",,,,,,"${totalSub.toFixed(2)}","${totalDisc.toFixed(2)}","${totalTax.toFixed(2)}","${totalGrand.toFixed(2)}","${totalPaid.toFixed(2)}","${totalDue.toFixed(2)}",\n`;

    const blob = new Blob([csv], { type: format === 'EXCEL' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = format === 'EXCEL' ? `Purchase_Invoices_${timestamp}.xls` : `Purchase_Invoices_${timestamp}.csv`;
    link.click();
  };

  const invoices: any[] = Array.isArray(invoicesData)
    ? invoicesData
    : Array.isArray((invoicesData as any)?.data)
    ? (invoicesData as any).data
    : Array.isArray((invoicesData as any)?.items)
    ? (invoicesData as any).items
    : [];

  // Filtered Purchase Invoices based on column header filters
  const filteredInvoices = invoices.filter((inv: any) => {
    if (colFilters.invoiceNo && !inv.invoiceNo?.toLowerCase().includes(colFilters.invoiceNo.toLowerCase())) {
      return false;
    }
    if (colFilters.supplierInvoiceNo && !inv.supplierInvoiceNo?.toLowerCase().includes(colFilters.supplierInvoiceNo.toLowerCase())) {
      return false;
    }
    if (colFilters.supplier) {
      const supp = `${inv.supplier?.nameAr || ''} ${inv.supplier?.nameEn || ''}`.toLowerCase();
      if (!supp.includes(colFilters.supplier.toLowerCase())) return false;
    }
    if (colFilters.status && inv.paymentStatus !== colFilters.status) {
      return false;
    }
    return true;
  });

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">فواتير الشراء والذمم الدائنة (Purchase Invoices & AP)</h3>
          <p className="text-muted mb-0">تسجيل فواتير الموردين، حساب الضرائب والخصومات، ومتابعة المدفوعات والأرصدة</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <i className="bi bi-receipt me-1"></i> تسجيل فاتورة شراء جديدة
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="ابحث برقم الفاتورة أو المورد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">جميع الموردين</option>
                {(suppliersData || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nameAr || s.nameEn}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="">جميع حالات السداد</option>
                <option value="PAID">مسددة بالكامل</option>
                <option value="PARTIAL">مسددة جزئياً</option>
                <option value="UNPAID">غير مسددة</option>
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted small">إجمالي الفواتير: <strong>{invoices.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            {/* Dynamic Top Action Bar when invoices are selected */}
            {checkedIds.length > 0 && (() => {
              const selectedList = invoices.filter((i: any) => checkedIds.includes(i.id));
              const singleInv = selectedList.length === 1 ? selectedList[0] : null;

              return (
                <div className="d-flex align-items-center justify-content-between p-2 px-3 bg-primary bg-opacity-10 border-bottom border-primary border-opacity-25 animate-fade-in flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary fs-6">{checkedIds.length}</span>
                    <span className="fw-bold small text-dark">فاتورة مشتريات محددة</span>
                    <span className="text-muted small ms-2">
                      (إجمالي المبالغ: <strong className="text-primary">{selectedList.reduce((sum: number, it: any) => sum + (Number(it.grandTotal) || 0), 0).toLocaleString()} ج.م</strong>)
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-1 flex-wrap">
                    {/* View Button: Works for single OR multiple invoices */}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary bg-white d-flex align-items-center gap-1"
                      title={singleInv ? "عرض تفاصيل الفاتورة" : "عرض ملخص الفواتير المحددة"}
                      onClick={() => {
                        if (singleInv) {
                          setSelectedInvoice(singleInv);
                        } else {
                          setShowMultiViewModal(true);
                        }
                      }}
                    >
                      <i className="bi bi-eye"></i>
                      <span className="small">{singleInv ? 'عرض الفاتورة' : `عرض (${selectedList.length}) فواتير`}</span>
                    </button>

                    {/* Download / Export Dropdown with Multiple Formats */}
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-success bg-white dropdown-toggle d-flex align-items-center gap-1"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <i className="bi bi-download"></i>
                        <span className="small">تحميل وتصدير</span>
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end shadow border-0" style={{ fontSize: '0.82rem' }}>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center gap-2"
                            type="button"
                            onClick={() => handleExportFormat(selectedList, 'PDF')}
                          >
                            <i className="bi bi-file-earmark-pdf text-danger fs-6"></i>
                            <span>تصدير ملف PDF جاهز للطباعة</span>
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center gap-2"
                            type="button"
                            onClick={() => handleExportFormat(selectedList, 'EXCEL')}
                          >
                            <i className="bi bi-file-earmark-excel text-success fs-6"></i>
                            <span>تصدير Excel (XLS)</span>
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center gap-2"
                            type="button"
                            onClick={() => handleExportFormat(selectedList, 'CSV')}
                          >
                            <i className="bi bi-filetype-csv text-primary fs-6"></i>
                            <span>تصدير CSV جدول بيانات</span>
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center gap-2"
                            type="button"
                            onClick={() => handleExportFormat(selectedList, 'TXT')}
                          >
                            <i className="bi bi-file-text text-secondary fs-6"></i>
                            <span>تقرير نصي منسق (TXT)</span>
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item d-flex align-items-center gap-2"
                            type="button"
                            onClick={() => handleExportFormat(selectedList, 'JSON')}
                          >
                            <i className="bi bi-filetype-json text-warning fs-6"></i>
                            <span>ملف بيانات برمجي (JSON)</span>
                          </button>
                        </li>
                      </ul>
                    </div>

                    {singleInv && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary bg-white d-flex align-items-center gap-1"
                          title="تعديل فاتورة الشراء"
                          onClick={() => handleOpenEdit(singleInv)}
                        >
                          <i className="bi bi-pencil-square"></i>
                          <span className="small">تعديل</span>
                        </button>

                        {singleInv.balanceDue > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success bg-white d-flex align-items-center gap-1"
                            title="تسجيل سداد دفعة للمورد"
                            onClick={() => {
                              setShowPaymentModal(singleInv);
                              setPayForm({
                                amount: singleInv.balanceDue,
                                paymentMethod: 'CASH',
                                referenceNo: '',
                                notes: `سداد فاتورة رقم ${singleInv.invoiceNo}`,
                              });
                            }}
                          >
                            <i className="bi bi-cash"></i>
                            <span className="small">سداد</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark bg-white d-flex align-items-center gap-1"
                          title="طباعة الفاتورة"
                          onClick={() => setSelectedInvoice(singleInv)}
                        >
                          <i className="bi bi-printer"></i>
                          <span className="small">طباعة</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-link text-muted p-1 ms-2"
                      title="إلغاء التحديد"
                      onClick={() => setCheckedIds([])}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              );
            })()}

            <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '40px' }} className="text-center">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={filteredInvoices.length > 0 && checkedIds.length === filteredInvoices.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCheckedIds(filteredInvoices.map((inv: any) => inv.id));
                        } else {
                          setCheckedIds([]);
                        }
                      }}
                    />
                  </th>

                  {/* رقم الفاتورة */}
                  <th>
                    <div className="d-flex align-items-center justify-content-center gap-1">
                      <span>رقم الفاتورة</span>
                      <div className="dropdown">
                        <button
                          type="button"
                          className={`btn btn-sm p-0 border-0 ${colFilters.invoiceNo ? 'text-primary fw-bold' : 'text-muted'}`}
                          data-bs-toggle="dropdown"
                          data-bs-auto-close="outside"
                          title="بحث برقم الفاتورة"
                        >
                          <i className={`bi ${colFilters.invoiceNo ? 'bi-funnel-fill text-primary' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-end p-2 shadow border-0" style={{ minWidth: '220px' }}>
                          <label className="form-label small fw-semibold text-muted mb-1 text-start d-block">رقم الفاتورة:</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="أدخل رقم الفاتورة..."
                            autoFocus
                            value={colFilters.invoiceNo}
                            onChange={(e) => setColFilters({ ...colFilters, invoiceNo: e.target.value })}
                          />
                          {colFilters.invoiceNo && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0 mt-1 text-decoration-none small"
                              onClick={() => setColFilters({ ...colFilters, invoiceNo: '' })}
                            >
                              مسح الفلتر
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </th>

                  {/* فاتورة المورد */}
                  <th>
                    <div className="d-flex align-items-center justify-content-center gap-1">
                      <span>فاتورة المورد</span>
                      <div className="dropdown">
                        <button
                          type="button"
                          className={`btn btn-sm p-0 border-0 ${colFilters.supplierInvoiceNo ? 'text-primary fw-bold' : 'text-muted'}`}
                          data-bs-toggle="dropdown"
                          data-bs-auto-close="outside"
                          title="بحث برقم فاتورة المورد"
                        >
                          <i className={`bi ${colFilters.supplierInvoiceNo ? 'bi-funnel-fill text-primary' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-end p-2 shadow border-0" style={{ minWidth: '220px' }}>
                          <label className="form-label small fw-semibold text-muted mb-1 text-start d-block">فاتورة المورد:</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="رقم فاتورة المورد..."
                            autoFocus
                            value={colFilters.supplierInvoiceNo}
                            onChange={(e) => setColFilters({ ...colFilters, supplierInvoiceNo: e.target.value })}
                          />
                          {colFilters.supplierInvoiceNo && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0 mt-1 text-decoration-none small"
                              onClick={() => setColFilters({ ...colFilters, supplierInvoiceNo: '' })}
                            >
                              مسح الفلتر
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </th>

                  {/* المورد */}
                  <th>
                    <div className="d-flex align-items-center justify-content-center gap-1">
                      <span>المورد</span>
                      <div className="dropdown">
                        <button
                          type="button"
                          className={`btn btn-sm p-0 border-0 ${colFilters.supplier ? 'text-primary fw-bold' : 'text-muted'}`}
                          data-bs-toggle="dropdown"
                          data-bs-auto-close="outside"
                          title="بحث باسم المورد"
                        >
                          <i className={`bi ${colFilters.supplier ? 'bi-funnel-fill text-primary' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-end p-2 shadow border-0" style={{ minWidth: '220px' }}>
                          <label className="form-label small fw-semibold text-muted mb-1 text-start d-block">اسم المورد:</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="أدخل اسم المورد..."
                            autoFocus
                            value={colFilters.supplier}
                            onChange={(e) => setColFilters({ ...colFilters, supplier: e.target.value })}
                          />
                          {colFilters.supplier && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0 mt-1 text-decoration-none small"
                              onClick={() => setColFilters({ ...colFilters, supplier: '' })}
                            >
                              مسح الفلتر
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </th>

                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي المطلوب</th>

                  {/* حالة السداد */}
                  <th>
                    <div className="d-flex align-items-center justify-content-center gap-1">
                      <span>حالة السداد</span>
                      <div className="dropdown">
                        <button
                          type="button"
                          className={`btn btn-sm p-0 border-0 ${colFilters.status ? 'text-primary fw-bold' : 'text-muted'}`}
                          data-bs-toggle="dropdown"
                          title="فلترة حالة السداد"
                        >
                          <i className={`bi ${colFilters.status ? 'bi-funnel-fill' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow border-0" style={{ fontSize: '0.82rem' }}>
                          <li>
                            <button
                              className={`dropdown-item ${!colFilters.status ? 'active' : ''}`}
                              type="button"
                              onClick={() => setColFilters({ ...colFilters, status: '' })}
                            >
                              كل الحالات
                            </button>
                          </li>
                          <li>
                            <button
                              className={`dropdown-item ${colFilters.status === 'PAID' ? 'active' : ''}`}
                              type="button"
                              onClick={() => setColFilters({ ...colFilters, status: 'PAID' })}
                            >
                              <span className="badge bg-success me-1">●</span> مسددة
                            </button>
                          </li>
                          <li>
                            <button
                              className={`dropdown-item ${colFilters.status === 'PARTIAL' ? 'active' : ''}`}
                              type="button"
                              onClick={() => setColFilters({ ...colFilters, status: 'PARTIAL' })}
                            >
                              <span className="badge bg-warning text-dark me-1">●</span> جزئي
                            </button>
                          </li>
                          <li>
                            <button
                              className={`dropdown-item ${colFilters.status === 'UNPAID' ? 'active' : ''}`}
                              type="button"
                              onClick={() => setColFilters({ ...colFilters, status: 'UNPAID' })}
                            >
                              <span className="badge bg-danger me-1">●</span> غير مسددة
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </th>

                  <th style={{ width: '80px' }}>
                    {(colFilters.invoiceNo || colFilters.supplierInvoiceNo || colFilters.supplier || colFilters.status) ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger p-0 text-decoration-none small"
                        title="مسح كل الفلاتر"
                        onClick={() => setColFilters({ invoiceNo: '', supplierInvoiceNo: '', supplier: '', status: '' })}
                      >
                        <i className="bi bi-x-circle-fill"></i>
                      </button>
                    ) : (
                      'عرض'
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="py-4 text-center">جاري التحميل...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr><td colSpan={10} className="py-5 text-muted text-center">لا توجد فواتير تطابق شروط البحث.</td></tr>
                ) : (
                  filteredInvoices.map((inv: any) => {
                    const isChecked = checkedIds.includes(inv.id);
                    return (
                      <tr
                        key={inv.id}
                        className={isChecked ? 'table-primary table-opacity-10' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (isChecked) {
                            setCheckedIds(checkedIds.filter(id => id !== inv.id));
                          } else {
                            setCheckedIds([...checkedIds, inv.id]);
                          }
                        }}
                      >
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCheckedIds([...checkedIds, inv.id]);
                              } else {
                                setCheckedIds(checkedIds.filter(id => id !== inv.id));
                              }
                            }}
                          />
                        </td>
                        <td className="fw-bold font-monospace text-primary text-decoration-underline" title="اضغط لعرض الفاتورة بالكامل">
                          {inv.invoiceNo}
                        </td>
                        <td className="font-monospace text-muted">{inv.supplierInvoiceNo || '—'}</td>
                        <td className="fw-semibold">{inv.supplier?.nameAr || inv.supplier?.nameEn}</td>
                        <td>{new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}</td>
                        <td className="font-monospace fw-bold">{inv.grandTotal.toFixed(2)} ج.م</td>
                        <td className="font-monospace text-success">{inv.paidAmount.toFixed(2)} ج.م</td>
                        <td className="font-monospace fw-bold text-danger">{inv.balanceDue.toFixed(2)} ج.م</td>
                        <td>
                          <span className={`badge ${inv.paymentStatus === 'PAID' ? 'bg-success' : inv.paymentStatus === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                            {inv.paymentStatus === 'PAID' ? 'مسددة' : inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مسددة'}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-light border text-primary py-0 px-2"
                            onClick={() => setSelectedInvoice(inv)}
                            title="عرض تفاصيل الفاتورة"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Overall Totals Footer for Purchase Invoices */}
              {filteredInvoices.length > 0 && (() => {
                const sumGrand = filteredInvoices.reduce((sum: number, it: any) => sum + (Number(it.grandTotal) || 0), 0);
                const sumPaid = filteredInvoices.reduce((sum: number, it: any) => sum + (Number(it.paidAmount) || 0), 0);
                const sumDue = filteredInvoices.reduce((sum: number, it: any) => sum + (Number(it.balanceDue) || 0), 0);
                return (
                  <tfoot className="table-light border-top border-2 border-primary fw-bold" style={{ fontSize: '0.9rem' }}>
                    <tr>
                      <td colSpan={5} className="text-start py-2 px-3">
                        <span className="text-primary me-2"><i className="bi bi-calculator"></i> الإجمالي الكلي لفواتير الشراء:</span>
                        <span className="badge bg-secondary text-white">{filteredInvoices.length} فاتورة</span>
                      </td>
                      <td className="py-2 text-dark font-monospace">{sumGrand.toLocaleString()} ج.م</td>
                      <td className="py-2 text-success font-monospace">{sumPaid.toLocaleString()} ج.م</td>
                      <td className="py-2 text-danger font-monospace">{sumDue.toLocaleString()} ج.م</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      </div>

      {/* Modal: New / Edit Purchase Invoice */}
      {(showAddModal || editingInvoice) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered my-4" style={{ maxHeight: '92vh' }}>
            <div className="modal-content border-0 shadow-lg d-flex flex-column" style={{ maxHeight: '90vh' }}>
              <div className="modal-header bg-primary text-white flex-shrink-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-receipt me-2"></i>
                  {editingInvoice ? `تعديل فاتورة الشراء (${editingInvoice.invoiceNo})` : 'تسجيل فاتورة شراء جديدة (Purchase Invoice)'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingInvoice(null);
                  }}
                ></button>
              </div>

              <form
                className="d-flex flex-column flex-grow-1 overflow-hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (invoiceItems.length === 0) {
                    alert('يجب إضافة بند واحد على الأقل في الفاتورة');
                    return;
                  }
                  const preparedItems = invoiceItems.map(it => ({
                    ...it,
                    taxRate: Number(form.taxRate) >= 0 ? Number(form.taxRate) : 0,
                  }));

                  if (editingInvoice) {
                    updateInvoiceMutation.mutate({
                      id: editingInvoice.id,
                      payload: {
                        ...form,
                        items: preparedItems,
                      },
                    });
                  } else {
                    createInvoiceMutation.mutate({
                      ...form,
                      items: preparedItems,
                    });
                  }
                }}
              >
                <div className="modal-body p-4 flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                  {/* Top Details */}
                  <div className="card border mb-3">
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">المورد *</label>
                          <select
                            className="form-select form-select-sm"
                            required
                            value={form.supplierId}
                            onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                          >
                            <option value="">-- اختر المورد --</option>
                            {(suppliersData || []).map((s: any) => (
                              <option key={s.id} value={s.id}>{s.nameAr || s.nameEn} ({s.supplierCode})</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">رقم فاتورة المورد (Supplier Ref)</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="INV-XXXX"
                            value={form.supplierInvoiceNo}
                            onChange={(e) => setForm({ ...form, supplierInvoiceNo: e.target.value })}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">المستودع *</label>
                          <select
                            className="form-select form-select-sm"
                            required
                            value={form.warehouseId}
                            onChange={(e) => {
                              const wh = (warehousesData || []).find((w: any) => w.id === e.target.value);
                              setForm({
                                ...form,
                                warehouseId: e.target.value,
                                branchId: wh?.branchId || form.branchId,
                              });
                            }}
                          >
                            <option value="">-- اختر المستودع --</option>
                            {(warehousesData || []).map((w: any) => (
                              <option key={w.id} value={w.id}>{w.nameAr || w.nameEn}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Items Box */}
                  <div className="card border mb-3">
                    <div className="card-header bg-light py-2">
                      <h6 className="mb-0 fw-bold">إضافة أصناف للفاتورة</h6>
                    </div>
                    <div className="card-body">
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="ابحث باسم المنتج أو القطعة لإضافتها..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                        {productSearch.trim().length > 0 && (
                          <div className="position-absolute bg-white border rounded shadow w-100 z-3 overflow-auto mt-1" style={{ maxHeight: '180px' }}>
                            {(productsData || [])
                              .filter((p: any) =>
                                p.nameAr?.toLowerCase().includes(productSearch.toLowerCase()) ||
                                p.nameEn?.toLowerCase().includes(productSearch.toLowerCase()) ||
                                p.sku?.toLowerCase().includes(productSearch.toLowerCase())
                              )
                              .map((p: any) => (
                                <div
                                  key={p.id}
                                  className="p-2 border-bottom hover-bg-light cursor-pointer d-flex justify-content-between align-items-center"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleAddProduct(p)}
                                >
                                  <div>
                                    <strong>{p.nameAr || p.nameEn}</strong>
                                    <span className="text-muted small ms-2">({p.sku})</span>
                                  </div>
                                  <span className="badge bg-primary">اختيار</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Table of Items */}
                      <div className="table-responsive mb-3">
                    <table className="table table-bordered align-middle text-center mb-0" style={{ fontSize: '0.82rem' }}>
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th className="text-start">الصنف</th>
                          <th style={{ width: '90px' }}>الكمية</th>
                          <th style={{ width: '120px' }}>سعر التكلفة</th>
                          <th style={{ width: '100px' }}>الخصم (ج.م)</th>
                          <th style={{ width: '130px' }}>الإجمالي</th>
                          <th style={{ width: '50px' }}>حذف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceItems.map((item, idx) => {
                          const sub = (item.quantity * item.unitCost) - (item.discount || 0);
                          const appliedTaxRate = Number(form.taxRate) || 0;
                          const tax = (sub * appliedTaxRate) / 100;
                          const lineTotal = sub + tax;
                          return (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td className="text-start">{item.productName}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center font-monospace"
                                  min={0}
                                  step="any"
                                  value={item.unitCost}
                                  onChange={(e) => handleUpdateItem(idx, 'unitCost', Number(e.target.value))}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  min={0}
                                  value={item.discount}
                                  onChange={(e) => handleUpdateItem(idx, 'discount', Number(e.target.value))}
                                />
                              </td>
                              <td className="fw-bold font-monospace text-primary">{lineTotal.toFixed(2)} ج.م</td>
                              <td>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveItem(idx)}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Summary */}
                  {(() => {
                    const subtotal = invoiceItems.reduce((sum, it) => sum + (it.quantity * it.unitCost), 0);
                    const itemDiscounts = invoiceItems.reduce((sum, it) => sum + (Number(it.discount) || 0), 0);
                    const totalDisc = itemDiscounts + (Number(form.discountTotal) || 0);
                    const taxable = Math.max(0, subtotal - totalDisc);
                    const effectiveTaxRate = Number(form.taxRate) >= 0 ? Number(form.taxRate) : 0;
                    const tax = (taxable * effectiveTaxRate) / 100;
                    const grandTotal = taxable + tax;
                    const due = Math.max(0, grandTotal - (Number(form.paidAmount) || 0));

                    return (
                      <div className="row g-3">
                        <div className="col-md-7">
                          <div className="card border p-3">
                            <h6 className="fw-bold mb-2">الدفع الفوري وشروط السداد</h6>
                            <div className="row g-2">
                              <div className="col-md-6">
                                <label className="form-label small fw-semibold">خصم إضافي عام</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  min={0}
                                  value={form.discountTotal}
                                  onChange={(e) => setForm({ ...form, discountTotal: Number(e.target.value) })}
                                />
                              </div>
                              <div className="col-md-6">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <label className="form-label small fw-semibold mb-0">نسبة الضريبة (%)</label>
                                  {form.taxRate !== 0 ? (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-danger small text-decoration-none"
                                      style={{ fontSize: '0.75rem' }}
                                      onClick={() => {
                                        setForm({ ...form, taxRate: 0 });
                                        setInvoiceItems(invoiceItems.map(it => ({ ...it, taxRate: 0 })));
                                      }}
                                    >
                                      إلغاء الضريبة (0%)
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-primary small text-decoration-none"
                                      style={{ fontSize: '0.75rem' }}
                                      onClick={() => {
                                        setForm({ ...form, taxRate: 14 });
                                        setInvoiceItems(invoiceItems.map(it => ({ ...it, taxRate: 14 })));
                                      }}
                                    >
                                      استعادة الضريبة (14%)
                                    </button>
                                  )}
                                </div>
                                <div className="input-group input-group-sm">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm font-monospace"
                                    min={0}
                                    max={100}
                                    step="any"
                                    value={form.taxRate}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                                      setForm({ ...form, taxRate: val });
                                      setInvoiceItems(invoiceItems.map(it => ({ ...it, taxRate: val })));
                                    }}
                                  />
                                  <span className="input-group-text">%</span>
                                </div>
                              </div>
                              <div className="col-md-6">
                                <label className="form-label small fw-semibold">المبلغ المدفوع فوراً (ج.م)</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-success fw-bold"
                                  min={0}
                                  max={grandTotal}
                                  value={form.paidAmount}
                                  onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })}
                                />
                              </div>
                              <div className="col-md-6">
                                <label className="form-label small fw-semibold">طريقة السداد</label>
                                <select
                                  className="form-select form-select-sm"
                                  value={form.paymentMethod}
                                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                                >
                                  <option value="CASH">نقدي (Cash)</option>
                                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                                  <option value="CHEQUE">شيك</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-5">
                          <div className="card border bg-light p-3">
                            <h6 className="fw-bold mb-2 border-bottom pb-2">ملخص الحساب</h6>
                            <div className="d-flex justify-content-between mb-1">
                              <span>المجموع الفرعي:</span>
                              <span className="font-monospace">{subtotal.toFixed(2)} ج.م</span>
                            </div>
                            <div className="d-flex justify-content-between mb-1 text-danger">
                              <span>إجمالي الخصم:</span>
                              <span className="font-monospace">-{totalDisc.toFixed(2)} ج.م</span>
                            </div>
                            <div className="d-flex justify-content-between mb-1">
                              <span>ضريبة القيمة المضافة:</span>
                              <span className="font-monospace">{tax.toFixed(2)} ج.م</span>
                            </div>
                            <hr className="my-1" />
                            <div className="d-flex justify-content-between fs-6 fw-bold mb-1">
                              <span>الإجمالي النهائي:</span>
                              <span className="font-monospace text-primary">{grandTotal.toFixed(2)} ج.م</span>
                            </div>
                            <div className="d-flex justify-content-between mb-1 text-success">
                              <span>المسدد فوراً:</span>
                              <span className="font-monospace">{(Number(form.paidAmount) || 0).toFixed(2)} ج.م</span>
                            </div>
                            <div className="d-flex justify-content-between border-top pt-1 fw-bold text-danger">
                              <span>المتبقي في حساب المورد (له):</span>
                              <span className="font-monospace">{due.toFixed(2)} ج.م</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="modal-footer bg-light flex-shrink-0">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingInvoice(null);
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold"
                    disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending || invoiceItems.length === 0}
                  >
                    {createInvoiceMutation.isPending || updateInvoiceMutation.isPending
                      ? 'جاري الحفظ...'
                      : editingInvoice
                      ? 'حفظ التعديلات وترحيل الحساب'
                      : 'حفظ الفاتورة وترحيل الحساب'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Make Payment */}
      {showPaymentModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">تسجيل دفعة سداد للمورد</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPaymentModal(null)}></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                createPaymentMutation.mutate({
                  ...payForm,
                  supplierId: showPaymentModal.supplierId,
                  invoiceId: showPaymentModal.id,
                });
              }}>
                <div className="modal-body p-4">
                  <div className="alert alert-light border mb-3">
                    <div>المورد: <strong>{showPaymentModal.supplier?.nameAr || showPaymentModal.supplier?.nameEn}</strong></div>
                    <div>فاتورة الشراء: <strong className="font-monospace text-primary">{showPaymentModal.invoiceNo}</strong></div>
                    <div>المتبقي المطلوب: <strong className="font-monospace text-danger">{showPaymentModal.balanceDue.toFixed(2)} ج.م</strong></div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">مبلغ الدفعة (ج.م) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min={1}
                      max={showPaymentModal.balanceDue}
                      step="any"
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">طريقة السداد</label>
                    <select
                      className="form-select"
                      value={payForm.paymentMethod}
                      onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    >
                      <option value="CASH">نقدي (Cash)</option>
                      <option value="BANK_TRANSFER">تحويل بنكي</option>
                      <option value="CHEQUE">شيك بنكي</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">رقم المرجع / التحويل</label>
                    <input
                      type="text"
                      className="form-control"
                      value={payForm.referenceNo}
                      onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(null)}>إلغاء</button>
                  <button type="submit" className="btn btn-success fw-bold" disabled={createPaymentMutation.isPending}>
                    {createPaymentMutation.isPending ? 'جاري السداد...' : 'تأكيد السداد'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Purchase Invoice Details */}
      {selectedInvoice && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} dir="rtl">
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable my-3" style={{ maxHeight: '90vh' }}>
            <div className="modal-content border-0 shadow-lg" style={{ height: '85vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header bg-dark text-white flex-shrink-0">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-spreadsheet text-primary fs-4"></i>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      فاتورة شراء: <span className="font-monospace text-warning">{selectedInvoice.invoiceNo}</span>
                    </h5>
                    <div className="small text-secondary">
                      تاريخ الفاتورة: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedInvoice(null)}></button>
              </div>

              <div className="modal-body overflow-auto p-4">
                {/* Invoice Summary Cards */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted mb-1">المورد</div>
                      <div className="fw-bold text-dark">{selectedInvoice.supplier?.nameAr || selectedInvoice.supplier?.nameEn}</div>
                      <div className="small text-muted">{selectedInvoice.supplier?.phone || '-'}</div>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted mb-1">الفرع والمخزن</div>
                      <div className="fw-bold text-dark">{selectedInvoice.branch?.nameAr || selectedInvoice.branch?.nameEn || 'الفرع الرئيسي'}</div>
                      <div className="small text-muted">{selectedInvoice.warehouse?.nameAr || selectedInvoice.warehouse?.nameEn || 'المخزن الرئيسي'}</div>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted mb-1">رقم فاتورة المورد</div>
                      <div className="fw-bold text-dark font-monospace">{selectedInvoice.supplierInvoiceNo || 'غير مسجل'}</div>
                      <div className="small text-muted">استحقاق: {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString('ar-EG') : 'فوري'}</div>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted mb-1">حالة السداد</div>
                      <div>
                        <span className={`badge ${selectedInvoice.paymentStatus === 'PAID' ? 'bg-success' : selectedInvoice.paymentStatus === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'} fs-6`}>
                          {selectedInvoice.paymentStatus === 'PAID' ? 'مسددة بالكامل' : selectedInvoice.paymentStatus === 'PARTIAL' ? 'سداد جزئي' : 'غير مسددة'}
                        </span>
                      </div>
                      <div className="small text-muted mt-1">متبقي: <strong className="text-danger">{selectedInvoice.balanceDue.toFixed(2)} ج.م</strong></div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <h6 className="fw-bold text-dark mb-3">
                  <i className="bi bi-box-seam me-1 text-primary"></i>
                  الأصناف والمنتجات المشتراة داخل الفاتورة
                </h6>
                <div className="table-responsive border rounded-3 mb-4">
                  <table className="table table-hover align-middle mb-0 text-center">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th className="text-start">اسم الصنف / المنتج</th>
                        <th>كود الصنف (SKU)</th>
                        <th>الكمية</th>
                        <th className="text-end">سعر الشراء (الوحدة)</th>
                        <th className="text-end">الخصم</th>
                        <th className="text-end">الضريبة</th>
                        <th className="text-end">إجمالي السعر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedInvoice.items || []).length === 0 ? (
                        <tr><td colSpan={8} className="py-4 text-muted">لا توجد تفاصيل أصناف</td></tr>
                      ) : (
                        selectedInvoice.items.map((it: any, i: number) => (
                          <tr key={it.id || i}>
                            <td>{i + 1}</td>
                            <td className="text-start fw-bold">
                              {it.product?.nameAr || it.product?.nameEn || 'صنف'}
                              {it.description && <div className="small text-muted">{it.description}</div>}
                            </td>
                            <td><code>{it.product?.sku || '-'}</code></td>
                            <td className="fw-bold">{it.quantity}</td>
                            <td className="text-end font-monospace">{it.unitCost.toFixed(2)} ج.م</td>
                            <td className="text-end font-monospace text-danger">{it.discount > 0 ? `${it.discount.toFixed(2)} ج.م` : '-'}</td>
                            <td className="text-end font-monospace">{it.taxAmount.toFixed(2)} ج.م ({it.taxRate}%)</td>
                            <td className="text-end font-monospace fw-bold text-primary">{it.totalCost.toFixed(2)} ج.م</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan={4} className="text-start">إجمالي الأصناف: {(selectedInvoice.items || []).length}</td>
                        <td colSpan={3} className="text-end">المجموع الكلي للفاتورة:</td>
                        <td className="text-end text-primary font-monospace fs-6">{selectedInvoice.grandTotal.toFixed(2)} ج.م</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Financial Summary Breakdown */}
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    {selectedInvoice.notes && (
                      <div className="p-3 bg-light rounded-3 border">
                        <div className="small fw-semibold text-muted mb-1">ملاحظات الفاتورة:</div>
                        <p className="mb-0 small text-dark">{selectedInvoice.notes}</p>
                      </div>
                    )}

                    {/* Associated Payments List */}
                    {(selectedInvoice.payments || []).length > 0 && (
                      <div className="mt-3">
                        <h6 className="fw-bold small text-dark mb-2">الدفعات والمسددات المسجلة:</h6>
                        <ul className="list-group list-group-flush border rounded-3">
                          {selectedInvoice.payments.map((p: any) => (
                            <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                              <div>
                                <span className="fw-semibold text-success">{p.amount.toFixed(2)} ج.م</span>
                                <span className="badge bg-light text-muted ms-2">{p.paymentMethod}</span>
                                {p.paymentNo && <span className="font-monospace text-muted small ms-2">({p.paymentNo})</span>}
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <span className="small text-muted">{new Date(p.paymentDate || p.createdAt).toLocaleDateString('ar-EG')}</span>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm py-0 px-2"
                                  title="إلغاء عملية السداد هذه واسترجاع الدين"
                                  disabled={cancelPaymentMutation.isPending}
                                  onClick={() => {
                                    if (confirm(`هل أنت متأكد من رغبتك في إلغاء عملية السداد بمبلغ ${p.amount} ج.م؟`)) {
                                      cancelPaymentMutation.mutate(p.id);
                                    }
                                  }}
                                >
                                  <i className="bi bi-x-circle me-1"></i> إلغاء السداد
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-muted">المجموع الفرعي (قبل الضريبة):</span>
                        <span className="font-monospace fw-bold">{selectedInvoice.subtotal.toFixed(2)} ج.م</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-muted">إجمالي الخصم المكتسب:</span>
                        <span className="font-monospace text-danger">-{selectedInvoice.discountTotal.toFixed(2)} ج.م</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-muted">ضريبة القيمة المضافة ({selectedInvoice.taxRate}%):</span>
                        <span className="font-monospace text-dark">+{selectedInvoice.taxAmount.toFixed(2)} ج.م</span>
                      </div>
                      <div className="d-flex justify-content-between py-2 border-bottom bg-white px-2 rounded my-1">
                        <span className="fw-bold text-dark fs-6">الإجمالي النهائي المطلوب:</span>
                        <span className="font-monospace fw-bold text-primary fs-6">{selectedInvoice.grandTotal.toFixed(2)} ج.م</span>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-success">المسدد حتى الآن:</span>
                        <span className="font-monospace text-success fw-bold">{selectedInvoice.paidAmount.toFixed(2)} ج.م</span>
                      </div>
                      <div className="d-flex justify-content-between py-2 bg-white px-2 rounded mt-1 border-top border-2 border-danger">
                        <span className="fw-bold text-danger">المتبقي المطلوب سداده:</span>
                        <span className="font-monospace fw-bold text-danger fs-5">{selectedInvoice.balanceDue.toFixed(2)} ج.م</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                  إغلاق
                </button>
                {selectedInvoice.balanceDue > 0 && (
                  <button
                    type="button"
                    className="btn btn-success fw-bold"
                    onClick={() => {
                      setShowPaymentModal(selectedInvoice);
                      setPayForm({
                        amount: selectedInvoice.balanceDue,
                        paymentMethod: 'CASH',
                        referenceNo: '',
                        notes: `سداد فاتورة رقم ${selectedInvoice.invoiceNo}`,
                      });
                    }}
                  >
                    <i className="bi bi-cash me-1"></i> سداد المتبقي الآن
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => window.print()}
                >
                  <i className="bi bi-printer me-1"></i> طباعة الفاتورة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== Multi-Invoice Selection View Modal for Purchases ===== */}
      {showMultiViewModal && (() => {
        const selectedList = invoices.filter((i: any) => checkedIds.includes(i.id));
        const sumGrand = selectedList.reduce((sum: number, it: any) => sum + (Number(it.grandTotal) || 0), 0);
        const sumPaid = selectedList.reduce((sum: number, it: any) => sum + (Number(it.paidAmount) || 0), 0);
        const sumDue = selectedList.reduce((sum: number, it: any) => sum + (Number(it.balanceDue) || 0), 0);

        return (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} dir="rtl">
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable my-3" style={{ maxHeight: '90vh' }}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-dark text-white">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-collection text-warning fs-4"></i>
                    <div>
                      <h5 className="modal-title fw-bold mb-0">
                        معاينة فواتير الشراء المحددة (<span className="text-warning">{selectedList.length}</span> فاتورة)
                      </h5>
                      <div className="small text-secondary">
                        عرض مجمع لبيانات ومبالغ فواتير الموردين المختارة مع إمكانية التحميل الفوري
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowMultiViewModal(false)}></button>
                </div>

                <div className="modal-body p-4">
                  {/* Summary Metric Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-4">
                      <div className="p-3 bg-light rounded border text-center">
                        <div className="small text-muted mb-1">إجمالي المشتريات المطلوبة</div>
                        <div className="fs-5 fw-bold font-monospace text-primary">{sumGrand.toLocaleString()} ج.م</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="p-3 bg-light rounded border text-center">
                        <div className="small text-muted mb-1">إجمالي المسدد للموردين</div>
                        <div className="fs-5 fw-bold font-monospace text-success">{sumPaid.toLocaleString()} ج.م</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="p-3 bg-light rounded border text-center">
                        <div className="small text-muted mb-1">إجمالي الذمم الدائنة المتبقية</div>
                        <div className="fs-5 fw-bold font-monospace text-danger">{sumDue.toLocaleString()} ج.م</div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Invoices Table */}
                  <div className="table-responsive border rounded">
                    <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.85rem' }}>
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>رقم الفاتورة</th>
                          <th>فاتورة المورد</th>
                          <th>المورد</th>
                          <th>التاريخ</th>
                          <th>الإجمالي</th>
                          <th>المدفوع</th>
                          <th>المتبقي</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedList.map((inv: any, idx: number) => (
                          <tr key={inv.id}>
                            <td>{idx + 1}</td>
                            <td className="font-monospace fw-bold text-primary">{inv.invoiceNo}</td>
                            <td className="font-monospace text-muted">{inv.supplierInvoiceNo || '—'}</td>
                            <td className="fw-semibold">{inv.supplier?.nameAr || inv.supplier?.nameEn}</td>
                            <td>{new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}</td>
                            <td className="font-monospace fw-bold">{inv.grandTotal?.toFixed(2)} ج.م</td>
                            <td className="font-monospace text-success">{inv.paidAmount?.toFixed(2)} ج.م</td>
                            <td className="font-monospace text-danger fw-bold">{inv.balanceDue?.toFixed(2)} ج.م</td>
                            <td>
                              <span className={`badge ${inv.paymentStatus === 'PAID' ? 'bg-success' : inv.paymentStatus === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                {inv.paymentStatus === 'PAID' ? 'مسددة' : inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مسددة'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="modal-footer bg-light d-flex justify-content-between">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowMultiViewModal(false)}>
                    إغلاق
                  </button>

                    <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-success dropdown-toggle"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="bi bi-download me-1"></i> تحميل وتصدير هذه الفواتير
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end shadow">
                      <li>
                        <button className="dropdown-item" type="button" onClick={() => handleExportFormat(selectedList, 'PDF')}>
                          <i className="bi bi-file-earmark-pdf text-danger me-2"></i> تحميل ملف PDF جاهز للطباعة
                        </button>
                      </li>
                      <li>
                        <button className="dropdown-item" type="button" onClick={() => handleExportFormat(selectedList, 'EXCEL')}>
                          <i className="bi bi-file-earmark-excel text-success me-2"></i> تحميل ملف Excel (XLS)
                        </button>
                      </li>
                      <li>
                        <button className="dropdown-item" type="button" onClick={() => handleExportFormat(selectedList, 'CSV')}>
                          <i className="bi bi-filetype-csv text-primary me-2"></i> تحميل ملف CSV
                        </button>
                      </li>
                      <li>
                        <button className="dropdown-item" type="button" onClick={() => handleExportFormat(selectedList, 'TXT')}>
                          <i className="bi bi-file-text text-secondary me-2"></i> تحميل تقرير نصي (TXT)
                        </button>
                      </li>
                      <li>
                        <button className="dropdown-item" type="button" onClick={() => handleExportFormat(selectedList, 'JSON')}>
                          <i className="bi bi-filetype-json text-warning me-2"></i> تحميل ملف JSON
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
