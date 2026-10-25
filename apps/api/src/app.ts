import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';
import { logger } from './utils/logger';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes';
import branchesRoutes from './modules/branches/branches.routes';
import warehousesRoutes from './modules/warehouses/warehouses.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import auditRoutes from './modules/audit/audit.routes';

// Phase 2 Routes
import categoriesRoutes from './modules/categories/categories.routes';
import brandsRoutes from './modules/brands/brands.routes';
import productsRoutes from './modules/products/products.routes';
import vehiclesRoutes from './modules/vehicles/vehicles.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';

// Phase 3 Routes: Customers, CRM & Sales
import customersRoutes from './modules/customers/customers.routes';
import crmRoutes from './modules/crm/crm.routes';
import salesRoutes from './modules/sales/sales.routes';
import workshopRoutes from './modules/workshop/workshop.routes';

// Phase 4 Routes: Purchasing & Suppliers
import purchasingRoutes from './modules/purchasing/purchasing.routes';

// Phase 5 Routes: Human Resources & Payroll
import hrRoutes from './modules/hr/hr.routes';

// Phase 6 Routes: Accounting Engine & General Ledger
import accountingRoutes from './modules/accounting/accounting.routes';

import { sendSuccess, sendError } from './utils/response';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(express.json({ limit: '10mb' }));

app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { success: false, message: 'Too many requests, please try again later.', code: 'RATE_LIMIT' }
});

app.use('/api/auth/login', authLimiter);

app.get('/api/health', (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);

// Phase 2 Modules Mount
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/inventory', inventoryRoutes);

// Phase 3 Modules Mount
app.use('/api/customers', customersRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/workshop', workshopRoutes);

// Phase 4 Modules Mount
app.use('/api/purchasing', purchasingRoutes);

// Phase 5 Modules Mount
app.use('/api/hr', hrRoutes);

// Phase 6 Modules Mount
app.use('/api/accounting', accountingRoutes);

app.use((req, res, next) => {
  sendError(res, { message: 'Route not found' }, 404, 'NOT_FOUND');
});

app.use(errorMiddleware);

export default app;
