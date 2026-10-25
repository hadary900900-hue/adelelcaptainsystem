import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthContext';
import apiClient from '../../../core/api/client';
// تفقيط الأرقام وتحويلها إلى كلمات عربية فصحى ديناميكياً
export function tafqeetArabic(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '';
  const num = Number(amount);
  if (num === 0) return 'فقط صفر جنيهاً مصرياً لا غير';

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;

    if (h > 0) res += hundreds[h];

    if (rem > 0) {
      if (res) res += ' و ';
      if (rem >= 10 && rem <= 19) {
        res += teens[rem - 10];
      } else {
        if (u > 0) {
          res += units[u];
          if (t > 0) res += ' و ';
        }
        if (t > 0) res += tens[t];
      }
    }
    return res;
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let text = '';
  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (billions > 0) {
    text += (billions === 1 ? 'مليار' : billions === 2 ? 'ملياران' : convertGroup(billions) + ' مليار');
  }

  if (millions > 0) {
    if (text) text += ' و ';
    text += (millions === 1 ? 'مليون' : millions === 2 ? 'مليونان' : convertGroup(millions) + ' مليون');
  }

  if (thousands > 0) {
    if (text) text += ' و ';
    text += (thousands === 1 ? 'ألف' : thousands === 2 ? 'ألفان' : (thousands >= 3 && thousands <= 10 ? convertGroup(thousands) + ' آلاف' : convertGroup(thousands) + ' ألف'));
  }

  if (remainder > 0) {
    if (text) text += ' و ';
    text += convertGroup(remainder);
  }

  let full = 'فقط ';
  if (integerPart > 0) {
    full += text + ' جنيهاً مصرياً';
  }

  if (decimalPart > 0) {
    if (integerPart > 0) full += ' و ';
    full += convertGroup(decimalPart) + ' قرشاً';
  }

  full += ' لا غير.';
  return full;
}

export default function InvoicesPage() {
  const { user, activeBranchId } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [editForm, setEditForm] = useState({
    invoiceType: 'CASH',
    paymentStatus: 'PAID',
    discountType: 'FIXED' as 'FIXED' | 'PERCENT',
    discountValue: 0,
    discountTotal: 0,
    taxRate: 14,
    dueDate: '',
    notes: '',
  });

  // Fetch Products Catalog for adding products to invoice
  const { data: productsCatalog } = useQuery({
    queryKey: ['products-catalog-for-invoice-edit'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products?limit=100');
      return res?.data?.data || res?.data || [];
    },
  });

  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['sales-invoices-list', search, typeFilter, statusFilter, startDate, endDate, activeBranchId],
    queryFn: async () => {
      const res: any = await apiClient.get('/sales/invoices', {
        params: {
          search: search || undefined,
          invoiceType: typeFilter || undefined,
          paymentStatus: statusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          branchId: activeBranchId || undefined,
          limit: 100
        }
      });
      return res?.data || res;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res: any = await apiClient.put(`/sales/invoices/${id}`, data);
      return res?.data || res;
    },
    onSuccess: () => {
      alert('تم تحديث الفاتورة بنجاح');
      setEditingInvoice(null);
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل تحديث الفاتورة');
    }
  });

  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');

  const paymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await apiClient.post('/sales/payments', payload);
      return res?.data || res;
    },
    onSuccess: () => {
      alert('تم تسجيل دفعة السداد بنجاح');
      setShowPaymentModal(null);
      if (selectedInvoice) {
        apiClient.get(`/sales/invoices/${selectedInvoice.id}`).then((res: any) => {
          setSelectedInvoice(res?.data?.data || res?.data);
        }).catch(() => {});
      }
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل تسجيل السداد');
    }
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res: any = await apiClient.delete(`/sales/payments/${paymentId}`);
      return res?.data || res;
    },
    onSuccess: () => {
      alert('تم إلغاء عملية السداد بنجاح واستعادة رصيد العميل والفاتورة');
      if (selectedInvoice) {
        apiClient.get(`/sales/invoices/${selectedInvoice.id}`).then((res: any) => {
          setSelectedInvoice(res?.data?.data || res?.data);
        }).catch(() => {});
      }
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل إلغاء السداد');
    }
  });

  const cancelGoodsIssueMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res: any = await apiClient.post(`/sales/invoices/${invoiceId}/cancel-goods-issue`);
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      alert(data?.message || 'تم إلغاء إذن الصرف المخزني وإرجاع كافة البضائع للمستودع بنجاح');
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل إلغاء إذن الصرف');
    }
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res: any = await apiClient.delete(`/sales/invoices/${invoiceId}`);
      return res?.data || res;
    },
    onSuccess: () => {
      alert('تم حذف الفاتورة بنجاح بعد استيفاء شروط إلغاء السدادات وإذن الصرف');
      setSelectedInvoice(null);
      refetch();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'فشل حذف الفاتورة');
    }
  });

  const invoices: any[] = Array.isArray(invoicesData)
    ? invoicesData
    : Array.isArray((invoicesData as any)?.data)
    ? (invoicesData as any).data
    : Array.isArray((invoicesData as any)?.items)
    ? (invoicesData as any).items
    : [];

  // Dedicated Print / Save as PDF handler
  const handlePrint = (invoice: any) => {
    const el = document.getElementById('printable-invoice');
    if (!el) {
      window.print();
      return;
    }
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
      doc.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>فاتورة مبيعات - ${invoice.invoiceNo}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: #fff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-invoice {
              width: 100% !important;
              min-height: 100vh !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
          </style>
        </head>
        <body>
          ${el.outerHTML}
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500);
    }
  };

  const [showMultiViewModal, setShowMultiViewModal] = useState(false);

  // Column Filter States
  const [colFilters, setColFilters] = useState({
    invoiceNo: '',
    customer: '',
    seller: '',
    branch: '',
    type: '',
    status: '',
  });

  const [showFiltersRow, setShowFiltersRow] = useState(false);

  // Multi-format Export Utility (PDF, EXCEL, CSV, JSON, TXT)
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

      const rowsHtml = targetInvoices.map((inv, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold;">${inv.invoiceNo}</td>
          <td>${inv.customer?.nameAr || inv.customer?.nameEn || 'عميل نقدي'}</td>
          <td>${sellerName(inv)}</td>
          <td>${inv.branch?.nameAr || inv.branch?.nameEn || 'الفرع الرئيسي'}</td>
          <td style="text-align: center;">${new Date(inv.createdAt).toLocaleDateString('ar-EG')}</td>
          <td style="text-align: center; font-weight: bold;">${inv.grandTotal?.toFixed(2)} ج.م</td>
          <td style="text-align: center; color: green;">${inv.paidAmount?.toFixed(2)} ج.م</td>
          <td style="text-align: center; color: red; font-weight: bold;">${inv.balanceDue?.toFixed(2)} ج.م</td>
          <td style="text-align: center;">${inv.paymentStatus === 'PAID' ? 'مدفوعة' : inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}</td>
        </tr>
      `).join('');

      const htmlContent = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8">
            <title>تقرير فواتير المبيعات - ${timestamp}</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; margin: 0; padding: 15px; color: #111; }
              .header { border-bottom: 2px solid #0e2439; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
              .title { font-size: 20px; font-weight: bold; color: #0e2439; }
              .meta { font-size: 12px; color: #666; margin-top: 3px; }
              .meta-boxes { display: flex; gap: 15px; margin-bottom: 15px; }
              .box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; text-align: center; }
              .box-title { font-size: 12px; color: #64748b; margin-bottom: 4px; }
              .box-val { font-size: 16px; font-weight: bold; font-family: monospace; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
              th { background-color: #f1f5f9; color: #0e2439; font-weight: bold; text-align: right; }
              tfoot td { font-weight: bold; background: #f8fafc; border-top: 2px solid #0e2439; }
              .footer { margin-top: 25px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">تقرير فواتير المبيعات (Sales Invoices Report)</div>
                <div class="meta">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')} • عدد الفواتير: ${targetInvoices.length}</div>
              </div>
              <div style="font-weight: bold; font-size: 18px; color: #0e2439;">نظام إدارة المؤسسة ERP</div>
            </div>

            <div class="meta-boxes">
              <div class="box">
                <div class="box-title">إجمالي مبالغ الفواتير</div>
                <div class="box-val" style="color: #0e2439;">${sumGrand.toLocaleString()} ج.م</div>
              </div>
              <div class="box">
                <div class="box-title">إجمالي المحصل الفعلي</div>
                <div class="box-val" style="color: #16a34a;">${sumPaid.toLocaleString()} ج.م</div>
              </div>
              <div class="box">
                <div class="box-title">إجمالي المتبقي المستحق</div>
                <div class="box-val" style="color: #dc2626;">${sumDue.toLocaleString()} ج.م</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">#</th>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>البائع</th>
                  <th>الفرع</th>
                  <th style="text-align: center;">التاريخ</th>
                  <th style="text-align: left;">الإجمالي</th>
                  <th style="text-align: left;">المدفوع</th>
                  <th style="text-align: left;">المتبقي</th>
                  <th style="text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="6" style="text-align: right;">المجموع الإجمالي للفواتير المحددة:</td>
                  <td style="text-align: left; font-family: monospace;">${sumGrand.toLocaleString()} ج.م</td>
                  <td style="text-align: left; color: #16a34a; font-family: monospace;">${sumPaid.toLocaleString()} ج.م</td>
                  <td style="text-align: left; color: #dc2626; font-family: monospace;">${sumDue.toLocaleString()} ج.م</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <div class="footer">
              تم استخراج التقرير آلياً • لحفظ التقرير كـ PDF اختر الوجهة (Save as PDF) من نافذة الطباعة
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
          // Fallback to iframe if popups are blocked
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
      downloadAnchor.setAttribute('download', `Invoices_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    if (format === 'TXT') {
      let txt = `====================================================\n`;
      txt += `تقرير الفواتير - صادرة بتاريخ ${new Date().toLocaleDateString('ar-EG')}\n`;
      txt += `العدد الإجمالي للفواتير: ${targetInvoices.length}\n`;
      txt += `====================================================\n\n`;

      targetInvoices.forEach((inv, i) => {
        txt += `${i + 1}. فاتورة رقم: ${inv.invoiceNo}\n`;
        txt += `   العميل: ${inv.customer?.nameAr || inv.customer?.nameEn || 'نقدي'}\n`;
        txt += `   التاريخ: ${new Date(inv.createdAt).toLocaleDateString('ar-EG')}\n`;
        txt += `   الإجمالي: ${inv.grandTotal?.toFixed(2)} ج.م | المسدد: ${inv.paidAmount?.toFixed(2)} ج.م | المتبقي: ${inv.balanceDue?.toFixed(2)} ج.م\n`;
        txt += `   الحالة: ${inv.paymentStatus === 'PAID' ? 'مدفوعة' : inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}\n`;
        txt += `   الفرع: ${inv.branch?.nameAr || inv.branch?.nameEn || 'الرئيسي'}\n`;
        txt += `----------------------------------------------------\n`;
      });

      const totalGrand = targetInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const totalPaid = targetInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
      const totalDue = targetInvoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);
      txt += `\nإجمالي مبالغ الفواتير: ${totalGrand.toFixed(2)} ج.م\n`;
      txt += `إجمالي المحصل: ${totalPaid.toFixed(2)} ج.م\n`;
      txt += `إجمالي المتبقي: ${totalDue.toFixed(2)} ج.م\n`;

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Invoices_${timestamp}.txt`;
      link.click();
      return;
    }

    // CSV & EXCEL (CSV with UTF-8 BOM is native Excel compatible)
    let csv = '\uFEFF';
    csv += 'رقم الفاتورة,العميل,الهاتف,الفرع,نوع الفاتورة,تاريخ الفاتورة,المجموع الفرعي,الخصم,الضريبة,الإجمالي النهائي,المدفوع,المتبقي المطلوب,حالة السداد\n';

    targetInvoices.forEach((inv: any) => {
      const custName = (inv.customer?.nameAr || inv.customer?.nameEn || '').replace(/,/g, ' ');
      const branchName = (inv.branch?.nameAr || inv.branch?.nameEn || '').replace(/,/g, ' ');
      csv += `"${inv.invoiceNo}","${custName}","${inv.customer?.phone || ''}","${branchName}","${inv.invoiceType}","${new Date(inv.createdAt).toLocaleDateString('ar-EG')}",${inv.subtotal || 0},${inv.discountTotal || 0},${inv.taxAmount || 0},${inv.grandTotal || 0},${inv.paidAmount || 0},${inv.balanceDue || 0},"${inv.paymentStatus}"\n`;
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
    link.download = format === 'EXCEL' ? `Invoices_Export_${timestamp}.xls` : `Invoices_Export_${timestamp}.csv`;
    link.click();
  };

  // Export Single Invoice as Excel
  const handleExportExcel = (inv: any) => {
    handleExportFormat([inv], 'EXCEL');
  };

  const handleOpenEdit = (inv: any) => {
    setEditingInvoice(inv);
    setEditItems(
      (inv.items || []).map((it: any) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product?.nameAr || it.product?.nameEn || 'منتج',
        sku: it.product?.sku || '',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        discount: it.discount || 0,
        taxRate: it.taxRate !== undefined ? it.taxRate : (inv.taxRate !== undefined ? inv.taxRate : 14),
        totalPrice: it.totalPrice || 0,
        type: it.product?.type || 'PHYSICAL',
        vehicleUnitId: it.vehicleUnitId || null,
      }))
    );
    setEditForm({
      invoiceType: inv.invoiceType || 'CASH',
      paymentStatus: inv.paymentStatus || 'UNPAID',
      discountType: 'FIXED',
      discountValue: inv.discountTotal || 0,
      discountTotal: inv.discountTotal || 0,
      taxRate: inv.taxRate !== undefined ? Number(inv.taxRate) : 14,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      notes: inv.notes || '',
    });
  };

  const handleAddProductToInvoice = (prod: any) => {
    if (!prod) return;
    const currentTaxRate = editForm.taxRate !== undefined ? editForm.taxRate : 14;
    const existingIndex = editItems.findIndex((it) => it.productId === prod.id);
    if (existingIndex > -1) {
      const updated = [...editItems];
      updated[existingIndex].quantity += 1;
      const sub = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      const tax = ((sub - updated[existingIndex].discount) * updated[existingIndex].taxRate) / 100;
      updated[existingIndex].totalPrice = sub - updated[existingIndex].discount + tax;
      setEditItems(updated);
    } else {
      const unitPrice = prod.retailPrice || 0;
      const qty = 1;
      const lineTotal = (qty * unitPrice);
      const tax = (lineTotal * currentTaxRate) / 100;
      setEditItems([
        ...editItems,
        {
          id: `temp-${Date.now()}-${Math.random()}`,
          productId: prod.id,
          productName: prod.nameAr || prod.nameEn,
          sku: prod.sku,
          quantity: qty,
          unitPrice: unitPrice,
          discount: 0,
          taxRate: currentTaxRate,
          totalPrice: lineTotal + tax,
          type: prod.type,
          vehicleUnitId: null,
        },
      ]);
    }
    setProductSearch('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...editItems];
    updated.splice(index, 1);
    setEditItems(updated);
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    const qty = Math.max(0.1, newQty);
    const updated = [...editItems];
    const item = updated[index];
    item.quantity = qty;
    const sub = qty * item.unitPrice;
    const tax = ((sub - (item.discount || 0)) * (item.taxRate !== undefined ? item.taxRate : 14)) / 100;
    item.totalPrice = sub - (item.discount || 0) + tax;
    setEditItems(updated);
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const price = Math.max(0, newPrice);
    const updated = [...editItems];
    const item = updated[index];
    item.unitPrice = price;
    const sub = item.quantity * price;
    const tax = ((sub - (item.discount || 0)) * (item.taxRate !== undefined ? item.taxRate : 14)) / 100;
    item.totalPrice = sub - (item.discount || 0) + tax;
    setEditItems(updated);
  };

  const handleUpdateItemDiscount = (index: number, newDisc: number) => {
    const disc = Math.max(0, newDisc);
    const updated = [...editItems];
    const item = updated[index];
    item.discount = disc;
    const sub = item.quantity * item.unitPrice;
    const tax = ((Math.max(0, sub - disc)) * (item.taxRate !== undefined ? item.taxRate : 14)) / 100;
    item.totalPrice = Math.max(0, sub - disc) + tax;
    setEditItems(updated);
  };

  const handleUpdateItemTaxRate = (index: number, newTax: number) => {
    const taxRate = Math.max(0, newTax);
    const updated = [...editItems];
    const item = updated[index];
    item.taxRate = taxRate;
    const sub = item.quantity * item.unitPrice;
    const tax = ((Math.max(0, sub - (item.discount || 0))) * taxRate) / 100;
    item.totalPrice = Math.max(0, sub - (item.discount || 0)) + tax;
    setEditItems(updated);
  };

  const paymentStatusBadge = (status: string) => {
    if (status === 'PAID') return 'bg-success text-white';
    if (status === 'PARTIAL') return 'bg-warning text-dark';
    return 'bg-danger text-white';
  };

  const sellerName = (inv: any) => {
    if (!inv.createdBy) return '—';
    return `${inv.createdBy.firstNameAr || inv.createdBy.firstNameEn || ''} ${inv.createdBy.lastNameAr || inv.createdBy.lastNameEn || ''}`.trim() || '—';
  };

  // Helper to check if invoice contains a vehicle/scooter or standard products (like oils, spare parts)
  const isVehicleInvoice = (inv: any) => {
    if (!inv || !inv.items) return false;
    return inv.workOrders?.[0]?.vehicleUnit || inv.items.some((it: any) => it.vehicleUnit || it.vehicleUnitId || it.product?.type === 'VEHICLE');
  };

  // Helper to get active vehicle unit from invoice
  const getInvoiceVehicleUnit = (inv: any) => {
    if (!inv) return null;
    // 1. If invoice has a linked workOrder with vehicleUnit
    if (inv.workOrders?.[0]?.vehicleUnit) return inv.workOrders[0].vehicleUnit;
    // 2. If invoice items have vehicleUnit directly attached
    const unitItem = inv.items?.find((it: any) => it.vehicleUnit);
    if (unitItem?.vehicleUnit) return unitItem.vehicleUnit;
    // 3. If item is a direct VEHICLE product sale
    const vProdItem = inv.items?.find((it: any) => it.product?.type === 'VEHICLE');
    return vProdItem?.vehicleUnit || null;
  };

  // Filtered invoices based on column header filters
  const filteredInvoices = invoices.filter((inv: any) => {
    if (colFilters.invoiceNo && !inv.invoiceNo?.toLowerCase().includes(colFilters.invoiceNo.toLowerCase())) {
      return false;
    }
    if (colFilters.customer) {
      const custName = `${inv.customer?.nameAr || ''} ${inv.customer?.nameEn || ''} ${inv.customer?.phone || ''}`.toLowerCase();
      if (!custName.includes(colFilters.customer.toLowerCase())) return false;
    }
    if (colFilters.seller) {
      const seller = sellerName(inv).toLowerCase();
      if (!seller.includes(colFilters.seller.toLowerCase())) return false;
    }
    if (colFilters.branch) {
      const branchStr = `${inv.branch?.nameAr || ''} ${inv.branch?.nameEn || ''}`.toLowerCase();
      if (!branchStr.includes(colFilters.branch.toLowerCase())) return false;
    }
    if (colFilters.type && inv.invoiceType !== colFilters.type) {
      return false;
    }
    if (colFilters.status && inv.paymentStatus !== colFilters.status) {
      return false;
    }
    return true;
  });

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">فواتير المبيعات</h3>
          <p className="text-muted mb-0">عرض الفواتير وتعديلها وحالة السداد وفلترة التواريخ وطباعة الإيصالات</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="بحث برقم الفاتورة أو اسم العميل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">كل الأنواع</option>
                <option value="CASH">نقدي</option>
                <option value="CREDIT">آجل</option>
                <option value="B2B">B2B شركات</option>
                <option value="CONSIGNMENT">أمانة</option>
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">كل الحالات</option>
                <option value="PAID">مدفوعة</option>
                <option value="PARTIAL">مدفوعة جزئياً</option>
                <option value="UNPAID">غير مدفوعة</option>
              </select>
            </div>
            <div className="col-md-2">
              <div className="input-group">
                <span className="input-group-text bg-light">من</span>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="من تاريخ"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="input-group">
                <span className="input-group-text bg-light">إلى</span>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="إلى تاريخ"
                />
              </div>
            </div>
            <div className="col-md-1 d-flex gap-1">
              <button
                type="button"
                className="btn btn-outline-secondary"
                title="إعادة ضبط الفلاتر"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                  setStatusFilter('');
                  setStartDate('');
                  setEndDate('');
                  setColFilters({
                    invoiceNo: '',
                    customer: '',
                    seller: '',
                    branch: '',
                    type: '',
                    status: '',
                  });
                }}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>جاري تحميل الفواتير...</div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-receipt display-4 mb-3 text-secondary d-block"></i>
              <h5>لا توجد فواتير</h5>
              <p>قم بإتمام عملية بيع من نقطة البيع لإنشاء فاتورة.</p>
            </div>
          ) : (
            <div className="table-responsive">
              {/* Dynamic Top Action Bar when invoices are selected */}
              {checkedIds.length > 0 && (() => {
                const selectedList = invoices.filter((i: any) => checkedIds.includes(i.id));
                const singleInv = selectedList.length === 1 ? selectedList[0] : null;

                return (
                  <div className="d-flex align-items-center justify-content-between p-2 px-3 bg-primary bg-opacity-10 border-bottom border-primary border-opacity-25 animate-fade-in flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-primary fs-6">{checkedIds.length}</span>
                      <span className="fw-bold small text-dark">فاتورة محددة</span>
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
                            title="تعديل بيانات الفاتورة"
                            onClick={() => handleOpenEdit(singleInv)}
                          >
                            <i className="bi bi-pencil-square"></i>
                            <span className="small">تعديل</span>
                          </button>

                          {singleInv.balanceDue > 0 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success bg-white d-flex align-items-center gap-1"
                              title="تسجيل سداد على الفاتورة"
                              onClick={() => {
                                setShowPaymentModal(singleInv);
                                setPayAmount(singleInv.balanceDue);
                                setPayMethod('CASH');
                                setPayNotes(`سداد فاتورة رقم ${singleInv.invoiceNo}`);
                              }}
                            >
                              <i className="bi bi-cash"></i>
                              <span className="small">سداد</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning bg-white d-flex align-items-center gap-1 text-dark"
                            title="إلغاء إذن الصرف المخزني وإرجاع البضاعة للمخزن"
                            disabled={cancelGoodsIssueMutation.isPending}
                            onClick={() => {
                              if (confirm(`هل ترغب في إلغاء إذن الصرف المخزني للفاتورة ${singleInv.invoiceNo}؟\nسيتم إرجاع جميع الأصناف للمستودع.`)) {
                                cancelGoodsIssueMutation.mutate(singleInv.id);
                              }
                            }}
                          >
                            <i className="bi bi-box-arrow-in-left"></i>
                            <span className="small">إلغاء الصرف المخزني</span>
                          </button>

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
                        className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                        title="حذف الفاتورة (يشترط إلغاء السداد وإذن الصرف أولاً)"
                        disabled={deleteInvoiceMutation.isPending}
                        onClick={() => {
                          const targetIds = [...checkedIds];
                          if (confirm(`هل أنت متأكد من رغبتك في حذف (${targetIds.length}) فاتورة محددة؟\nتنبيه: لن يتم الحذف إلا بعد إلغاء السدادات وإلغاء إذن الصرف المخزني.`)) {
                            targetIds.forEach(id => deleteInvoiceMutation.mutate(id));
                            setCheckedIds([]);
                          }
                        }}
                      >
                        <i className="bi bi-trash"></i>
                        <span className="small">حذف</span>
                      </button>

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

              <table className="table table-hover align-middle mb-0">
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
                      <div className="d-flex align-items-center justify-content-between gap-1">
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
                            <label className="form-label small fw-semibold text-muted mb-1">بحث برقم الفاتورة:</label>
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

                    {/* العميل */}
                    <th>
                      <div className="d-flex align-items-center justify-content-between gap-1">
                        <span>العميل</span>
                        <div className="dropdown">
                          <button
                            type="button"
                            className={`btn btn-sm p-0 border-0 ${colFilters.customer ? 'text-primary fw-bold' : 'text-muted'}`}
                            data-bs-toggle="dropdown"
                            data-bs-auto-close="outside"
                            title="بحث باسم أو هاتف العميل"
                          >
                            <i className={`bi ${colFilters.customer ? 'bi-funnel-fill text-primary' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
                          </button>
                          <div className="dropdown-menu dropdown-menu-end p-2 shadow border-0" style={{ minWidth: '230px' }}>
                            <label className="form-label small fw-semibold text-muted mb-1">بحث باسم أو هاتف العميل:</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="اسم العميل أو الهاتف..."
                              autoFocus
                              value={colFilters.customer}
                              onChange={(e) => setColFilters({ ...colFilters, customer: e.target.value })}
                            />
                            {colFilters.customer && (
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0 mt-1 text-decoration-none small"
                                onClick={() => setColFilters({ ...colFilters, customer: '' })}
                              >
                                مسح الفلتر
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </th>

                    {/* البائع */}
                    <th>
                      <div className="d-flex align-items-center justify-content-between gap-1">
                        <span>البائع</span>
                        <div className="dropdown">
                          <button
                            type="button"
                            className={`btn btn-sm p-0 border-0 ${colFilters.seller ? 'text-primary fw-bold' : 'text-muted'}`}
                            data-bs-toggle="dropdown"
                            data-bs-auto-close="outside"
                            title="فلترة بالبائع"
                          >
                            <i className={`bi ${colFilters.seller ? 'bi-funnel-fill text-primary' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
                          </button>
                          <div className="dropdown-menu dropdown-menu-end p-2 shadow border-0" style={{ minWidth: '210px' }}>
                            <label className="form-label small fw-semibold text-muted mb-1">بحث باسم البائع:</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="اسم البائع أو الموظف..."
                              autoFocus
                              value={colFilters.seller}
                              onChange={(e) => setColFilters({ ...colFilters, seller: e.target.value })}
                            />
                            {colFilters.seller && (
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0 mt-1 text-decoration-none small"
                                onClick={() => setColFilters({ ...colFilters, seller: '' })}
                              >
                                مسح الفلتر
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </th>

                    {/* الفرع */}
                    <th>
                      <div className="d-flex align-items-center justify-content-between gap-1">
                        <span>الفرع</span>
                        <div className="dropdown">
                          <button
                            type="button"
                            className={`btn btn-sm p-0 border-0 ${colFilters.branch ? 'text-primary fw-bold' : 'text-muted'}`}
                            data-bs-toggle="dropdown"
                            data-bs-auto-close="outside"
                            title="فلترة بالفرع"
                          >
                            <i className={`bi ${colFilters.branch ? 'bi-funnel-fill text-primary' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
                          </button>
                          <div className="dropdown-menu dropdown-menu-end p-2 shadow border-0" style={{ minWidth: '200px' }}>
                            <label className="form-label small fw-semibold text-muted mb-1">اسم الفرع:</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="ابحث باسم الفرع..."
                              autoFocus
                              value={colFilters.branch}
                              onChange={(e) => setColFilters({ ...colFilters, branch: e.target.value })}
                            />
                            {colFilters.branch && (
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0 mt-1 text-decoration-none small"
                                onClick={() => setColFilters({ ...colFilters, branch: '' })}
                              >
                                مسح الفلتر
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </th>

                    {/* النوع */}
                    <th>
                      <div className="d-flex align-items-center justify-content-between gap-1">
                        <span>النوع</span>
                        <div className="dropdown">
                          <button
                            type="button"
                            className={`btn btn-sm p-0 border-0 ${colFilters.type ? 'text-primary fw-bold' : 'text-muted'}`}
                            data-bs-toggle="dropdown"
                            title="اختيار نوع الفاتورة"
                          >
                            <i className={`bi ${colFilters.type ? 'bi-funnel-fill' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end shadow border-0" style={{ fontSize: '0.82rem' }}>
                            <li>
                              <button
                                className={`dropdown-item ${!colFilters.type ? 'active' : ''}`}
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, type: '' })}
                              >
                                كل الأنواع
                              </button>
                            </li>
                            <li>
                              <button
                                className={`dropdown-item ${colFilters.type === 'CASH' ? 'active' : ''}`}
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, type: 'CASH' })}
                              >
                                نقدي
                              </button>
                            </li>
                            <li>
                              <button
                                className={`dropdown-item ${colFilters.type === 'CREDIT' ? 'active' : ''}`}
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, type: 'CREDIT' })}
                              >
                                آجل
                              </button>
                            </li>
                            <li>
                              <button
                                className={`dropdown-item ${colFilters.type === 'B2B' ? 'active' : ''}`}
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, type: 'B2B' })}
                              >
                                B2B شركات
                              </button>
                            </li>
                            <li>
                              <button
                                className={`dropdown-item ${colFilters.type === 'CONSIGNMENT' ? 'active' : ''}`}
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, type: 'CONSIGNMENT' })}
                              >
                                أمانة
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </th>

                    <th>الإجمالي</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>

                    {/* الحالة */}
                    <th>
                      <div className="d-flex align-items-center justify-content-between gap-1">
                        <span>الحالة</span>
                        <div className="dropdown">
                          <button
                            type="button"
                            className={`btn btn-sm p-0 border-0 ${colFilters.status ? 'text-primary fw-bold' : 'text-muted'}`}
                            data-bs-toggle="dropdown"
                            title="اختيار حالة السداد"
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
                                <span className="badge bg-success me-1">●</span> مدفوعة
                              </button>
                            </li>
                            <li>
                              <button
                                className={`dropdown-item ${colFilters.status === 'PARTIAL' ? 'active' : ''}`}
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, status: 'PARTIAL' })}
                              >
                                <span className="badge bg-warning text-dark me-1">●</span> مدفوعة جزئياً
                              </button>
                            </li>
                            <li>
                              <button
                                className={`dropdown-item ${colFilters.status === 'UNPAID' ? 'active' : ''}`}
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, status: 'UNPAID' })}
                              >
                                <span className="badge bg-danger me-1">●</span> غير مدفوعة
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </th>

                    <th>التاريخ</th>
                    <th className="text-center" style={{ width: '80px' }}>
                      {(colFilters.invoiceNo || colFilters.customer || colFilters.seller || colFilters.branch || colFilters.type || colFilters.status) ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-0 text-decoration-none small"
                          title="مسح كل الفلاتر"
                          onClick={() => setColFilters({ invoiceNo: '', customer: '', seller: '', branch: '', type: '', status: '' })}
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
                  {filteredInvoices.map((inv: any) => {
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
                        <td>
                          <div className="fw-semibold">{inv.customer?.nameAr || inv.customer?.nameEn}</div>
                          <div className="small text-muted">{inv.customer?.phone}</div>
                        </td>
                        <td>
                          <div className="small">{sellerName(inv)}</div>
                        </td>
                        <td>
                          <div>{inv.branch?.nameAr || inv.branch?.nameEn}</div>
                        </td>
                        <td><span className="badge bg-light text-dark border">{inv.invoiceType}</span></td>
                        <td className="fw-bold text-dark">{inv.grandTotal?.toLocaleString()} ج.م</td>
                        <td className="text-success">{inv.paidAmount?.toLocaleString()} ج.م</td>
                        <td className={inv.balanceDue > 0 ? 'text-danger fw-bold' : 'text-muted'}>
                          {inv.balanceDue?.toLocaleString()} ج.م
                        </td>
                        <td>
                          <span className={`badge ${paymentStatusBadge(inv.paymentStatus)}`}>
                            {inv.paymentStatus === 'PAID' ? 'مدفوعة' :
                             inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}
                          </span>
                        </td>
                        <td>{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-light border text-primary py-0 px-2"
                            title="عرض تفاصيل الفاتورة"
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Overall Totals Footer */}
                {filteredInvoices.length > 0 && (() => {
                  const sumGrand = filteredInvoices.reduce((sum: number, it: any) => sum + (Number(it.grandTotal) || 0), 0);
                  const sumPaid = filteredInvoices.reduce((sum: number, it: any) => sum + (Number(it.paidAmount) || 0), 0);
                  const sumDue = filteredInvoices.reduce((sum: number, it: any) => sum + (Number(it.balanceDue) || 0), 0);
                  return (
                    <tfoot className="table-light border-top border-2 border-primary fw-bold" style={{ fontSize: '0.9rem' }}>
                      <tr>
                        <td colSpan={6} className="text-start py-2 px-3">
                          <span className="text-primary me-2"><i className="bi bi-calculator"></i> الإجمالي الكلي للفواتير المعروضة:</span>
                          <span className="badge bg-secondary text-white">{filteredInvoices.length} فاتورة</span>
                        </td>
                        <td className="py-2 text-dark font-monospace">{sumGrand.toLocaleString()} ج.م</td>
                        <td className="py-2 text-success font-monospace">{sumPaid.toLocaleString()} ج.م</td>
                        <td className="py-2 text-danger font-monospace">{sumDue.toLocaleString()} ج.م</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== Printable Invoice Modal ===== */}
      {selectedInvoice && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(11, 25, 44, 0.8)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '900px' }}>
            <div className="modal-content border-0 shadow-lg rounded-3">
              
              <div className="modal-header bg-dark text-white border-0 px-4 py-3">
                <h5 className="modal-title fw-bold fs-6">
                  <i className="bi bi-printer me-2 text-warning" />
                  طباعة فاتورة مبيعات — {selectedInvoice.invoiceNo}
                </h5>
                <div>
                  <button type="button" className="btn btn-warning btn-sm fw-bold me-2" onClick={() => handlePrint(selectedInvoice)}>
                    <i className="bi bi-printer me-1"></i> طباعة
                  </button>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedInvoice(null)}></button>
                </div>
              </div>

              <div className="modal-body p-0 bg-secondary bg-opacity-10 d-flex justify-content-center">
                
                {/* YOUR ORIGINAL A4 Printable Container */}
                <div 
                  id="printable-invoice" 
                  className="bg-white position-relative shadow-sm d-flex flex-column"
                  style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    boxSizing: 'border-box',
                    padding: '0 0 20px 0',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  
                  {/* HEADER DESIGN WITH ANGLED STRIPE & TAX DATA */}
                  <div className="position-relative overflow-hidden mb-3" style={{ backgroundColor: '#0e2439', color: '#fff', minHeight: '120px' }}>
                    <div className="row g-0 align-items-center h-100 px-4 py-3">
                      {/* Logo & Brand */}
                      <div className="col-4">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-bicycle fs-1 text-warning me-2"></i>
                          <div>
                            <h3 className="fw-extrabold mb-0 text-white" style={{ letterSpacing: '1px' }}>ADEL<span className="text-warning">ELCAPTAIN</span></h3>
                            <div className="small text-light opacity-75" style={{ fontSize: '0.7rem' }}>مبيعات - صيانة - قطع غيار</div>
                          </div>
                        </div>
                      </div>

                      {/* Center Brands */}
                      <div className="col-4 text-center">
                        <div className="fw-bold mb-1" style={{ fontSize: '1.1rem' }}> عادل الكابتن </div>
                        <div className="text-warning small" style={{ fontSize: '0.75rem' }}>وكيل معتمد لجميع العلامات التجارية</div>
                        <div className="d-flex justify-content-center gap-2 mt-1 opacity-75 small" style={{ fontSize: '0.65rem' }}>
                          <span>SYM</span> • <span>KEEWAY</span> • <span>REPSOL</span> • <span>MOTUL</span>
                        </div>
                      </div>

                      {/* Right Tax & Reg Meta Data */}
                      <div className="col-4 text-end">
                        <div className="bg-white bg-opacity-10 p-2 rounded border border-light border-opacity-25 d-inline-block text-start" style={{ fontSize: '0.68rem' }}>
                          <div className="text-light">رقم البطاقة الضريبية: <span className="fw-bold text-warning">xxx-xxx-xxx</span></div>
                          <div className="text-light">رقم السجل التجاري: <span className="fw-bold text-warning">xxxx</span></div>
                          <div className="text-warning opacity-75 mt-1" style={{ fontSize: '0.6rem' }}>تطبق الشروط والأحكام</div>
                        </div>
                      </div>
                    </div>

                    {/* Orange Accent Stripe */}
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '100%',
                        height: '6px',
                        background: 'linear-gradient(90deg, #0e2439 0%, #f39c12 100%)'
                      }}
                    />
                  </div>

                  {/* CONTENT CONTAINER */}
                  <div className="px-4 flex-grow-1 d-flex flex-column">

                    {/* INVOICE TITLE BAR */}
                    <div className="d-flex align-items-center justify-content-between mb-3 text-dark">
                      <div className="d-flex align-items-center">
                        <i className={`bi ${isVehicleInvoice(selectedInvoice) ? 'bi-receipt-cutoff' : 'bi-box-seam'} fs-3 text-primary me-2`}></i>
                        <h4 className="fw-extrabold mb-0" style={{ color: '#0e2439' }}>
                      فاتورة بيع  {selectedInvoice.invoiceNo}
                        </h4>
                      </div>
                      <div className="small text-muted">
                        تاريخ الفاتورة: <span className="fw-bold font-monospace text-dark">{new Date(selectedInvoice.createdAt).toISOString().split('T')[0]}</span>
                      </div>
                    </div>

                    {/* CARDS SECTION: DYNAMICALLY SWITCHES BETWEEN VEHICLE DATA OR PRODUCTS/OILS DATA */}
                    <div className="row g-3 mb-3">
                      
                      <div className="col-8">
                        <div className="rounded-3 overflow-hidden h-100" style={{ backgroundColor: '#f4f6f9' }}>
                          <div className="px-3 py-1 text-white fw-bold small d-flex align-items-center justify-content-between" style={{ backgroundColor: '#0e2439', fontSize: '0.78rem' }}>
                            <span>{isVehicleInvoice(selectedInvoice) ? 'بيانات العميل والمركبة' : 'بيانات العميل والطلب'}</span>
                            <i className={isVehicleInvoice(selectedInvoice) ? 'bi bi-person-badge' : 'bi bi-person-lines-fill'}></i>
                          </div>
                          <div className="p-2">
                            {isVehicleInvoice(selectedInvoice) ? (
                              /* 1. VEHICLE / SCOOTER DATA FIELDS */
                              (() => {
                                const vUnit = getInvoiceVehicleUnit(selectedInvoice);
                                // The scooter vehicle product linked to the vehicle unit
                                const scooterProduct = vUnit?.product;
                                // Fallback item product if selling vehicle directly without separate unit product
                                const directVehicleItem = selectedInvoice.items?.find((it: any) => it.product?.type === 'VEHICLE');
                                const fallbackProduct = directVehicleItem?.product;

                                const vehicleBrand = vUnit?.model?.brand?.nameAr || vUnit?.model?.brand?.nameEn || scooterProduct?.brand || fallbackProduct?.brand || 'سكوتر';
                                const vehicleModel = vUnit?.model?.nameAr || vUnit?.model?.nameEn || scooterProduct?.nameAr || scooterProduct?.nameEn || fallbackProduct?.nameAr || fallbackProduct?.nameEn || '—';
                                const vehicleYear = vUnit?.modelYear || scooterProduct?.year || fallbackProduct?.year || '—';
                                const vehicleColor = vUnit?.color || scooterProduct?.color || fallbackProduct?.color || '—';

                                return (
                                  <div className="row g-2" style={{ fontSize: '0.78rem' }}>
                                    <div className="col-6">
                                      <span className="text-muted">اسم العميل: </span>
                                      <span className="fw-bold text-dark">{selectedInvoice.customer?.nameAr || selectedInvoice.customer?.nameEn || 'عميل نقدي'}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">تليفون: </span>
                                      <span className="font-monospace fw-semibold">{selectedInvoice.customer?.phone || '—'}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">نوع المركبة: </span>
                                      <span className="fw-semibold">{vehicleBrand}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">رقم اللوحة: </span>
                                      <span className="fw-semibold">{vUnit?.plateNumber || 'لم ترخص'}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">الموديل: </span>
                                      <span className="fw-semibold text-primary">{vehicleModel}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">رقم الشاسية: </span>
                                      <span className="font-monospace fw-bold text-dark">{vUnit?.vin || '—'}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">سنة الصنع: </span>
                                      <span>{vehicleYear}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">رقم الموتور: </span>
                                      <span className="font-monospace fw-bold text-dark">{vUnit?.engineNumber || vUnit?.engineNo || '—'}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">اللون: </span>
                                      <span className="fw-semibold">{vehicleColor}</span>
                                    </div>
                                    <div className="col-6">
                                      <span className="text-muted">قراءة العداد: </span>
                                      <span>{vUnit?.mileage ?? selectedInvoice.workOrders?.[0]?.odometerReading ?? '0'} كم</span>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              /* 2. STANDARD PRODUCTS / OILS / SPARE PARTS DATA FIELDS */
                              <div className="row g-2" style={{ fontSize: '0.78rem' }}>
                                <div className="col-6">
                                  <span className="text-muted">اسم العميل: </span>
                                  <span className="fw-bold text-dark">{selectedInvoice.customer?.nameAr || selectedInvoice.customer?.nameEn || 'عميل نقدي'}</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted">تليفون العميل: </span>
                                  <span className="font-monospace fw-semibold">{selectedInvoice.customer?.phone || '—'}</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted">عدد الأصناف: </span>
                                  <span className="fw-bold">{selectedInvoice.items?.length || 0} أصناف</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted">طريقة الدفع: </span>
                                  <span className="fw-semibold">{selectedInvoice.invoiceType === 'CASH' ? 'كاش / نقدي' : selectedInvoice.invoiceType}</span>
                                </div>
                                <div className="col-12">
                                  <span className="text-muted">العنوان / الملاحظات: </span>
                                  <span className="fw-normal">{selectedInvoice.customer?.address || selectedInvoice.notes || '—'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Left: Sales Meta Info */}
                      <div className="col-4">
                        <div className="p-3 rounded-3 h-100 d-flex flex-column justify-content-between" style={{ backgroundColor: '#f4f6f9', fontSize: '0.78rem' }}>
                          <div>
                            <div className="text-muted small mb-1">موظف البيع:</div>
                            <div className="fw-bold text-dark mb-2">{sellerName(selectedInvoice)}</div>
                            
                            <div className="text-muted small mb-1">الفرع:</div>
                            <div className="fw-semibold mb-2">{selectedInvoice.branch?.nameAr || selectedInvoice.branch?.nameEn || 'EL-CAPTAIN'}</div>
                          </div>
                          
                          <div className="border-top pt-2">
                            <span className="text-muted small">حالة السداد: </span>
                            <span className="badge bg-success ms-1">{selectedInvoice.paymentStatus === 'PAID' ? 'مدفوعة' : selectedInvoice.paymentStatus}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* ITEMS TABLE FOR PRODUCTS & OILS */}
                    <div className="mb-3">
                      <table className="table table-bordered align-middle text-center mb-0" style={{ fontSize: '0.8rem', borderColor: '#e0e6ed' }}>
                        <thead>
                          <tr className="text-white" style={{ backgroundColor: '#0e2439' }}>
                            <th style={{ width: '5%' }}>م</th>
                            <th style={{ width: '15%' }}>كود المنتج</th>
                            <th style={{ width: '35%' }} className="text-start px-3">اسم المنتج / الصنف</th>
                            <th style={{ width: '10%' }}>الوحدة</th>
                            <th style={{ width: '8%' }}>الكمية</th>
                            <th style={{ width: '12%' }}>سعر الوحدة</th>
                            <th style={{ width: '15%' }}>الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items?.map((it: any, idx: number) => (
                            <tr key={it.id || idx}>
                              <td className="text-muted fw-semibold">{idx + 1}</td>
                              <td className="font-monospace text-secondary" style={{ fontSize: '0.72rem' }}>{it.product?.sku || 'SKU-OIL-100'}</td>
                              <td className="text-start px-3">
                                <div className="fw-bold text-dark">{it.description || it.product?.nameAr || it.product?.nameEn || 'زيت موتور سينثتيك'}</div>
                                {it.product?.category && (
                                  <div className="text-muted small" style={{ fontSize: '0.68rem' }}>{it.product.category}</div>
                                )}
                              </td>
                              <td className="text-muted">{it.product?.unit || 'لتر / علبة'}</td>
                              <td className="fw-semibold font-monospace">{it.quantity?.toFixed(2)}</td>
                              <td className="font-monospace">{it.unitPrice?.toFixed(2)}</td>
                              <td className="fw-bold font-monospace text-dark">{it.totalPrice?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* DETAILED TOTALS & BREAKDOWN SECTION */}
                    <div className="row g-3 mb-3">
                      
                      {/* Left: Breakdown Table */}
                      <div className="col-7">
                        <div className="rounded border overflow-hidden" style={{ fontSize: '0.75rem' }}>
                          <table className="table table-sm table-striped mb-0">
                            <tbody>
                              <tr>
                                <td>إجمالي قيمة المنتجات قبل الخصم</td>
                                <td className="text-end font-monospace">{selectedInvoice.subtotal?.toFixed(2) || selectedInvoice.grandTotal?.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td>إجمالي الخصومات المطبقة</td>
                                <td className="text-end font-monospace text-danger">{selectedInvoice.discountTotal?.toFixed(2) || '0.00'}</td>
                              </tr>
                              <tr>
                                <td>ضريبة القيمة المضافة 14%</td>
                                <td className="text-end font-monospace">{selectedInvoice.taxAmount?.toFixed(2) || '0.00'}</td>
                              </tr>
                              <tr>
                                <td>إجمالي القيمة المستحقة بعد الضريبة والخصم</td>
                                <td className="text-end font-monospace fw-bold">{selectedInvoice.grandTotal?.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right: Net Summary Cards */}
                      <div className="col-5">
                        <div className="p-3 rounded-3 text-white h-100 d-flex flex-column justify-content-center" style={{ backgroundColor: '#0e2439' }}>
                          <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.8rem' }}>
                            <span className="opacity-75">إجمالي المنتجات:</span>
                            <span className="font-monospace">{selectedInvoice.subtotal?.toFixed(2) || selectedInvoice.grandTotal?.toFixed(2)} ج.م</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '0.8rem' }}>
                            <span className="opacity-75">الخصم:</span>
                            <span className="font-monospace text-warning">{selectedInvoice.discountTotal?.toFixed(2) || '0.00'} ج.م</span>
                          </div>
                          <div className="border-top border-light border-opacity-25 pt-2 d-flex justify-content-between align-items-center">
                            <span className="fw-bold">صافي القيمة:</span>
                            <span className="fw-bold fs-5 text-warning font-monospace">{selectedInvoice.grandTotal?.toFixed(2)} ج.م</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* AMOUNT IN WORDS BANNER */}
                    <div className="rounded p-2 text-center fw-bold mb-3" style={{ backgroundColor: '#f4f6f9', border: '1px solid #e0e6ed', color: '#0e2439', fontSize: '0.85rem' }}>
                      {tafqeetArabic(selectedInvoice.grandTotal)}
                    </div>

                    {/* FOOTER BRANCHES & ADDRESSES */}
        {/* MODERN & CLEAN FOOTER (DYNAMIC & UNIVERSAL) */}
                    <div className="pt-3 mt-auto">
                      
                      {/* SIGNATURES & STAMP SECTION */}
                      <div className="row text-center mb-3 align-items-end" style={{ fontSize: '0.75rem' }}>
                        <div className="col-4">
                          <div className="text-muted mb-4">توقيع المشتري / الاستلام</div>
                          <div className="border-bottom mx-auto" style={{ width: '80%', borderColor: '#ccc' }}></div>
                        </div>
                        <div className="col-4">
                          <div className="p-2 border rounded bg-light d-inline-block text-muted" style={{ fontSize: '0.68rem', borderStyle: 'dashed !important' }}>
                            <i className="bi bi-patch-check me-1 text-primary"></i> ختم الشركة / الاعتماد
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted mb-4">مسئول المبيعات</div>
                          <div className="fw-bold text-dark mb-1">{sellerName(selectedInvoice)}</div>
                          <div className="border-bottom mx-auto" style={{ width: '80%', borderColor: '#ccc' }}></div>
                        </div>
                      </div>

                      {/* BRANCH DETAILS & QR BAR */}
                      <div className="rounded-3 p-2 text-white position-relative overflow-hidden" style={{ backgroundColor: '#0e2439', fontSize: '0.72rem' }}>
                        <div className="row align-items-center g-2">
                          
                          {/* Left: Dynamic Branch Info */}
                          <div className="col-7">
                            <div className="d-flex align-items-center mb-1">
                              <i className="bi bi-geo-alt-fill text-warning me-1"></i>
                              <span className="fw-bold me-2">{selectedInvoice.branch?.nameAr || selectedInvoice.branch?.nameEn || 'الفرع الرئيسي'}</span>
                            </div>
                            <div className="text-light opacity-75 small text-truncate">
                              <i className="bi bi-building me-1"></i>
                              {selectedInvoice.branch?.address || 'القاهرة - جمهورية مصر العربية'}
                            </div>
                            <div className="text-light opacity-75 small mt-1">
                              <i className="bi bi-telephone-fill me-1 text-warning"></i>
                              {selectedInvoice.branch?.phone || 'خدمة العملاء والخدمات اللوجستية'}
                            </div>
                          </div>

                          {/* Right: Modern QR & Thank You Message */}
                          <div className="col-5 border-start border-light border-opacity-25 ps-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <div>
                                <div className="fw-bold text-warning mb-1">شكراً لثقتكم بنا!</div>
                                <div className="text-light opacity-75" style={{ fontSize: '0.65rem' }}>يسعدنا دائماً خدمتكم</div>
                              </div>
                              <div className="bg-white p-1 rounded shadow-sm">
                                <i className="bi bi-qr-code fs-4 text-dark d-block"></i>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* BOTTOM TINY STRIP */}
                      <div className="d-flex justify-content-between align-items-center mt-2 text-muted px-1" style={{ fontSize: '0.65rem' }}>
                        <div><i className="bi bi-shield-check me-1 text-success"></i> فاتورة مبيعات معتمدة ونظامية</div>
                        <div>طُبعت بتاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* Associated Payments List inside View Invoice */}
              {(selectedInvoice.payments || []).length > 0 && (
                <div className="px-4 py-2 border-top bg-light">
                  <h6 className="fw-bold small text-dark mb-2">الدفعات والسدادات المسجلة على هذه الفاتورة:</h6>
                  <ul className="list-group list-group-flush border rounded-3 mb-2">
                    {selectedInvoice.payments.map((p: any) => (
                      <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center py-2 bg-white">
                        <div>
                          <span className="fw-bold text-success font-monospace">{p.amount?.toFixed(2)} ج.م</span>
                          <span className="badge bg-light text-dark border ms-2">{p.paymentMethod}</span>
                          {p.paymentNo && <span className="font-monospace text-muted small ms-2">({p.paymentNo})</span>}
                          {p.notes && <span className="text-muted small ms-2">- {p.notes}</span>}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="small text-muted">{new Date(p.createdAt).toLocaleDateString('ar-EG')}</span>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm py-0 px-2"
                            title="إلغاء عملية السداد واستعادة الرصيد"
                            disabled={cancelPaymentMutation.isPending}
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من إلغاء عملية السداد بمبلغ ${p.amount} ج.م؟`)) {
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

              <div className="modal-footer bg-light px-4 py-2 d-flex justify-content-between flex-wrap gap-2">
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoice(null)}>إغلاق</button>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={() => handleExportExcel(selectedInvoice)}>
                    <i className="bi bi-file-earmark-excel me-1"></i> تصدير Excel
                  </button>
                  <button type="button" className="btn btn-primary btn-sm px-4" onClick={() => handlePrint(selectedInvoice)}>
                    <i className="bi bi-printer me-1"></i> طباعة الفاتورة
                  </button>
                </div>

                <div className="d-flex gap-2">
                  {selectedInvoice.balanceDue > 0 && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => {
                        setShowPaymentModal(selectedInvoice);
                        setPayAmount(selectedInvoice.balanceDue);
                        setPayMethod('CASH');
                        setPayNotes(`سداد فاتورة رقم ${selectedInvoice.invoiceNo}`);
                      }}
                    >
                      <i className="bi bi-cash me-1"></i> سداد المتبقي ({selectedInvoice.balanceDue.toFixed(2)} ج.م)
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline-warning btn-sm"
                    title="إلغاء إذن الصرف المخزني لإعادة البضائع للمخزن"
                    disabled={cancelGoodsIssueMutation.isPending}
                    onClick={() => {
                      if (confirm(`هل ترغب في إلغاء إذن الصرف المخزني للفاتورة ${selectedInvoice.invoiceNo}؟\nسيتم إرجاع جميع المنتجات والمركبات المسجلة بالفاتورة إلى رصيد المستودع فوراً.`)) {
                        cancelGoodsIssueMutation.mutate(selectedInvoice.id);
                      }
                    }}
                  >
                    <i className="bi bi-box-arrow-in-left me-1"></i> إلغاء إذن الصرف المخزني (إرجاع للمخزن)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    title="حذف الفاتورة (مشروط بإلغاء السدادات وإذن الصرف)"
                    disabled={deleteInvoiceMutation.isPending}
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف الفاتورة ${selectedInvoice.invoiceNo} نهائياً؟\nتنبيه: يجب إلغاء كافة السدادات وإلغاء إذن الصرف أولاً.`)) {
                        deleteInvoiceMutation.mutate(selectedInvoice.id);
                      }
                    }}
                  >
                    <i className="bi bi-trash me-1"></i> حذف الفاتورة
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ===== Customer Payment Modal ===== */}
      {showPaymentModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">تسجيل سداد على الفاتورة</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPaymentModal(null)}></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                paymentMutation.mutate({
                  customerId: showPaymentModal.customerId,
                  invoiceId: showPaymentModal.id,
                  amount: payAmount,
                  paymentMethod: payMethod,
                  notes: payNotes,
                });
              }}>
                <div className="modal-body p-4">
                  <div className="alert alert-light border mb-3">
                    <div>الفاتورة: <strong className="font-monospace text-primary">{showPaymentModal.invoiceNo}</strong></div>
                    <div>العميل: <strong>{showPaymentModal.customer?.nameAr || showPaymentModal.customer?.nameEn}</strong></div>
                    <div>إجمالي الفاتورة: <strong>{showPaymentModal.grandTotal?.toFixed(2)} ج.م</strong></div>
                    <div className="text-danger fw-bold">المتبقي المطلوب: {showPaymentModal.balanceDue?.toFixed(2)} ج.م</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">مبلغ السداد (ج.م) *</label>
                    <input
                      type="number"
                      className="form-control fw-bold text-success"
                      required
                      min={0.1}
                      max={showPaymentModal.balanceDue}
                      step="any"
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">طريقة الدفع *</label>
                    <select
                      className="form-select"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      <option value="CASH">نقدي (خزينة)</option>
                      <option value="BANK_TRANSFER">تحويل بنكي</option>
                      <option value="CHEQUE">شيك</option>
                      <option value="CARD">بطاقة / POS</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">ملاحظات السداد</label>
                    <input
                      type="text"
                      className="form-control"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(null)}>إلغاء</button>
                  <button type="submit" className="btn btn-success fw-bold" disabled={paymentMutation.isPending}>
                    {paymentMutation.isPending ? 'جاري السداد...' : 'تأكيد السداد'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Invoice Modal ===== */}
      {editingInvoice && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2"></i>
                  تعديل فاتورة مبيعات: {editingInvoice.invoiceNo}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setEditingInvoice(null)}></button>
              </div>
              <div className="modal-body bg-light">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">نوع الفاتورة</label>
                    <select
                      className="form-select"
                      value={editForm.invoiceType}
                      onChange={(e) => setEditForm({ ...editForm, invoiceType: e.target.value })}
                    >
                      <option value="CASH">نقدي</option>
                      <option value="CREDIT">آجل</option>
                      <option value="B2B">B2B شركات</option>
                      <option value="CONSIGNMENT">أمانة</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">حالة السداد</label>
                    <select
                      className="form-select"
                      value={editForm.paymentStatus}
                      onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    >
                      <option value="PAID">مدفوعة</option>
                      <option value="PARTIAL">مدفوعة جزئياً</option>
                      <option value="UNPAID">غير مدفوعة</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">نسبة الضريبة الافتراضية (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editForm.taxRate}
                      onChange={(e) => setEditForm({ ...editForm, taxRate: Number(e.target.value) })}
                    />
                  </div>

                  <div className="col-12 mt-4">
                    <label className="form-label small fw-bold">إضافة منتج أو خدمة للفاتورة</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ابحث في الكتالوج لإضافة منتج..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                    {productSearch && productsCatalog && (
                      <div className="list-group position-absolute shadow w-100" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                        {productsCatalog
                          .filter((p: any) => (p.nameAr || p.nameEn || '').toLowerCase().includes(productSearch.toLowerCase()))
                          .map((prod: any) => (
                            <button
                              key={prod.id}
                              type="button"
                              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                              onClick={() => handleAddProductToInvoice(prod)}
                            >
                              <span>{prod.nameAr || prod.nameEn}</span>
                              <span className="badge bg-primary rounded-pill">{prod.retailPrice || 0} ج.م</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <h6 className="fw-bold mt-3">بنود الفاتورة الحالية:</h6>
                    <div className="table-responsive bg-white rounded shadow-sm p-2">
                      <table className="table table-bordered align-middle text-center mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>الصنف</th>
                            <th>الكمية</th>
                            <th>سعر الوحدة</th>
                            <th>الخصم</th>
                            <th>الضريبة %</th>
                            <th>الإجمالي</th>
                            <th>حذف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editItems.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="text-start fw-bold">{item.productName}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemQty(idx, Number(e.target.value))}
                                  step="0.1"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  value={item.discount}
                                  onChange={(e) => handleUpdateItemDiscount(idx, Number(e.target.value))}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm text-center"
                                  value={item.taxRate}
                                  onChange={(e) => handleUpdateItemTaxRate(idx, Number(e.target.value))}
                                />
                              </td>
                              <td className="fw-bold font-monospace">{item.totalPrice?.toFixed(2)}</td>
                              <td>
                                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleRemoveItem(idx)}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-bold">ملاحظات الفاتورة</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn-secondary btn" onClick={() => setEditingInvoice(null)}>إلغاء</button>
                <button
                  type="button"
                  className="btn btn-success px-4"
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    const subtotal = editItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
                    const discountTotal = editItems.reduce((acc, it) => acc + (it.discount || 0), 0);
                    const taxAmount = editItems.reduce((acc, it) => {
                      const lineSub = (it.quantity * it.unitPrice) - (it.discount || 0);
                      return acc + (Math.max(0, lineSub) * (it.taxRate || 14)) / 100;
                    }, 0);
                    const grandTotal = editItems.reduce((acc, it) => acc + (it.totalPrice || 0), 0);

                    updateMutation.mutate({
                      id: editingInvoice.id,
                      data: {
                        invoiceType: editForm.invoiceType,
                        paymentStatus: editForm.paymentStatus,
                        notes: editForm.notes,
                        subtotal,
                        discountTotal,
                        taxAmount,
                        grandTotal,
                        items: editItems.map((it) => ({
                          productId: it.productId,
                          quantity: it.quantity,
                          unitPrice: it.unitPrice,
                          discount: it.discount,
                          taxRate: it.taxRate,
                          totalPrice: it.totalPrice,
                          vehicleUnitId: it.vehicleUnitId
                        }))
                      }
                    });
                  }}
                >
                  {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== Multi-Invoice Selection View Modal ===== */}
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
                        معاينة الفواتير المحددة (<span className="text-warning">{selectedList.length}</span> فاتورة)
                      </h5>
                      <div className="small text-secondary">
                        عرض مجمع لبيانات ومبالغ الفواتير المختارة مع إمكانية التحميل المباشر
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
                        <div className="small text-muted mb-1">إجمالي المبالغ المطلوبة</div>
                        <div className="fs-5 fw-bold font-monospace text-primary">{sumGrand.toLocaleString()} ج.م</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="p-3 bg-light rounded border text-center">
                        <div className="small text-muted mb-1">إجمالي المحصل / المدفوع</div>
                        <div className="fs-5 fw-bold font-monospace text-success">{sumPaid.toLocaleString()} ج.م</div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="p-3 bg-light rounded border text-center">
                        <div className="small text-muted mb-1">إجمالي المتبقي المستحق</div>
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
                          <th>العميل</th>
                          <th>الفرع</th>
                          <th>النوع</th>
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
                            <td className="fw-semibold">{inv.customer?.nameAr || inv.customer?.nameEn}</td>
                            <td>{inv.branch?.nameAr || inv.branch?.nameEn}</td>
                            <td><span className="badge bg-light text-dark border">{inv.invoiceType}</span></td>
                            <td>{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</td>
                            <td className="font-monospace fw-bold">{inv.grandTotal?.toLocaleString()} ج.م</td>
                            <td className="font-monospace text-success">{inv.paidAmount?.toLocaleString()} ج.م</td>
                            <td className="font-monospace text-danger fw-bold">{inv.balanceDue?.toLocaleString()} ج.م</td>
                            <td>
                              <span className={`badge ${paymentStatusBadge(inv.paymentStatus)}`}>
                                {inv.paymentStatus === 'PAID' ? 'مدفوعة' : inv.paymentStatus === 'PARTIAL' ? 'جزئي' : 'غير مدفوعة'}
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
                      <i className="bi bi-download me-1"></i> تحميل هذه الفواتير المحددة
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