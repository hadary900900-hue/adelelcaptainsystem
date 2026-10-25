import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './core/auth/AuthContext';
import ProtectedRoute from './core/auth/ProtectedRoute';
import AppShell from './core/layout/AppShell';
import LoginPage from './modules/auth/pages/LoginPage';
import ForgotPasswordPage from './modules/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './modules/auth/pages/ResetPasswordPage';
import DashboardPage from './modules/dashboard/pages/DashboardPage';
import NotFoundPage from './modules/common/NotFoundPage';

import BranchesPage from './modules/branches/pages/BranchesPage';
import WarehousesPage from './modules/warehouses/pages/WarehousesPage';
import UsersPage from './modules/users/pages/UsersPage';
import RolesPage from './modules/roles/pages/RolesPage';
import AuditLogsPage from './modules/audit/pages/AuditLogsPage';

// Phase 2 Pages
import ProductsPage from './modules/products/pages/ProductsPage';
import VehiclesPage from './modules/vehicles/pages/VehiclesPage';
import InventoryPage from './modules/inventory/pages/InventoryPage';
import StockOverviewPage from './modules/inventory/pages/StockOverviewPage';
import TransfersPage from './modules/inventory/pages/TransfersPage';
import AdjustmentsPage from './modules/inventory/pages/AdjustmentsPage';
import StockOrdersPage from './modules/inventory/pages/StockOrdersPage';
import CategoriesPage from './modules/categories/pages/CategoriesPage';
import BrandsPage from './modules/brands/pages/BrandsPage';

// Phase 3 Pages: Sales, Customers & CRM
import CustomersPage from './modules/customers/pages/CustomersPage';
import LeadsPage from './modules/crm/pages/LeadsPage';
import ActivitiesPage from './modules/crm/pages/ActivitiesPage';
import PosPage from './modules/sales/pages/PosPage';
import SalesDashboardPage from './modules/sales/pages/SalesDashboardPage';
import InvoicesPage from './modules/sales/pages/InvoicesPage';
import QuotationsPage from './modules/sales/pages/QuotationsPage';
import OrdersPage from './modules/sales/pages/OrdersPage';
import ReservationsPage from './modules/sales/pages/ReservationsPage';

// Phase 4 Workshop Pages
import ReceptionPage from './modules/workshop/pages/ReceptionPage';
import WorkOrdersPage from './modules/workshop/pages/WorkOrdersPage';
import WorkOrderDetailPage from './modules/workshop/pages/WorkOrderDetailPage';
import ServicesCatalogPage from './modules/workshop/pages/ServicesCatalogPage';
import HistoryPage from './modules/workshop/pages/HistoryPage';

// Phase 4 Purchasing & Suppliers Pages
import PurchasingDashboardPage from './modules/purchasing/pages/PurchasingDashboardPage';
import SuppliersPage from './modules/purchasing/pages/SuppliersPage';
import PurchaseOrdersPage from './modules/purchasing/pages/PurchaseOrdersPage';
import GoodsReceiptsPage from './modules/purchasing/pages/GoodsReceiptsPage';
import PurchaseInvoicesPage from './modules/purchasing/pages/PurchaseInvoicesPage';
import PurchaseReturnsPage from './modules/purchasing/pages/PurchaseReturnsPage';

// Phase 5 HR & Payroll Pages
import HrDashboardPage from './modules/hr/pages/HrDashboardPage';
import EmployeesPage from './modules/hr/pages/EmployeesPage';
import AttendancePage from './modules/hr/pages/AttendancePage';
import PayrollPage from './modules/hr/pages/PayrollPage';

// Phase 6 Accounting Pages
import AccountingDashboardPage from './modules/accounting/pages/AccountingDashboardPage';
import ChartOfAccountsPage from './modules/accounting/pages/ChartOfAccountsPage';
import JournalEntriesPage from './modules/accounting/pages/JournalEntriesPage';
import GeneralLedgerPage from './modules/accounting/pages/GeneralLedgerPage';
import ExpensesPage from './modules/accounting/pages/ExpensesPage';
import AccountMappingsPage from './modules/accounting/pages/AccountMappingsPage';
import FinancialReportsPage from './modules/accounting/pages/FinancialReportsPage';
import ProfitabilityPage from './modules/accounting/pages/ProfitabilityPage';

const SettingsPage = () => (
  <div className="erp-card p-4">
    <h4 className="fw-bold mb-2">Settings & Configuration</h4>
    <p className="text-muted">
      Organization parameters: Currency (EGP), Default VAT (14%), Language preference, and branch assignments.
    </p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          
          {/* Phase 3 Sales & POS Routes */}
          <Route path="sales/pos" element={<PosPage />} />
          <Route path="sales/dashboard" element={<SalesDashboardPage />} />
          <Route path="sales/invoices" element={<InvoicesPage />} />
          <Route path="sales/quotations" element={<QuotationsPage />} />
          <Route path="sales/orders" element={<OrdersPage />} />
          {/* sales/returns — placeholder until ReturnsPage is implemented */}
          <Route path="sales/reservations" element={<ReservationsPage />} />

          {/* Phase 3 Customers & CRM Routes */}
          <Route path="customers" element={<CustomersPage />} />
          <Route path="crm/leads" element={<LeadsPage />} />
          <Route path="crm/activities" element={<ActivitiesPage />} />

          {/* Phase 4 Workshop Routes */}
          <Route path="workshop/reception" element={<ReceptionPage />} />
          <Route path="workshop/work-orders" element={<WorkOrdersPage />} />
          <Route path="workshop/work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="workshop/services" element={<ServicesCatalogPage />} />
          <Route path="workshop/history/:type/:id" element={<HistoryPage />} />

          {/* Phase 4 Purchasing & Suppliers Routes */}
          <Route path="purchasing" element={<PurchasingDashboardPage />} />
          <Route path="purchasing/dashboard" element={<PurchasingDashboardPage />} />
          <Route path="purchasing/suppliers" element={<SuppliersPage />} />
          <Route path="purchasing/orders" element={<PurchaseOrdersPage />} />
          <Route path="purchasing/goods-receipts" element={<GoodsReceiptsPage />} />
          <Route path="purchasing/invoices" element={<PurchaseInvoicesPage />} />
          <Route path="purchasing/returns" element={<PurchaseReturnsPage />} />

          {/* Phase 5 HR & Payroll Routes */}
          <Route path="hr" element={<HrDashboardPage />} />
          <Route path="hr/dashboard" element={<HrDashboardPage />} />
          <Route path="hr/employees" element={<EmployeesPage />} />
          <Route path="hr/attendance" element={<AttendancePage />} />
          <Route path="hr/payroll" element={<PayrollPage />} />

          {/* Phase 6 Accounting Engine Routes */}
          <Route path="accounting" element={<AccountingDashboardPage />} />
          <Route path="accounting/dashboard" element={<AccountingDashboardPage />} />
          <Route path="accounting/profitability" element={<ProfitabilityPage />} />
          <Route path="accounting/chart-of-accounts" element={<ChartOfAccountsPage />} />
          <Route path="accounting/journal-entries" element={<JournalEntriesPage />} />
          <Route path="accounting/general-ledger" element={<GeneralLedgerPage />} />
          <Route path="accounting/expenses" element={<ExpensesPage />} />
          <Route path="accounting/mappings" element={<AccountMappingsPage />} />
          <Route path="accounting/reports" element={<FinancialReportsPage />} />

          {/* Phase 2 Catalog & Inventory Routes */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="spare-parts" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="stock-overview" element={<StockOverviewPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="adjustments" element={<AdjustmentsPage />} />
          <Route path="stock-orders" element={<StockOrdersPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
