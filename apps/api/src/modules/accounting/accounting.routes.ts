import { Router } from 'express';
import { AccountingController } from './accounting.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@erp/shared';

const router = Router();
const controller = new AccountingController();

router.use(authMiddleware);

// 1. Chart of Accounts
router.get('/accounts', requirePermission(PERMISSIONS.ACCOUNTING.VIEW), (req, res, next) => controller.listAccounts(req, res).catch(next));
router.get('/accounts/:id', requirePermission(PERMISSIONS.ACCOUNTING.VIEW), (req, res, next) => controller.getAccountById(req, res).catch(next));
router.post('/accounts', requirePermission(PERMISSIONS.ACCOUNTING.CREATE_ACCOUNT), (req, res, next) => controller.createAccount(req, res).catch(next));
router.put('/accounts/:id', requirePermission(PERMISSIONS.ACCOUNTING.UPDATE_ACCOUNT), (req, res, next) => controller.updateAccount(req, res).catch(next));

// 2. Journal Entries
router.get('/journal-entries', requirePermission(PERMISSIONS.ACCOUNTING.VIEW), (req, res, next) => controller.listJournalEntries(req, res).catch(next));
router.post('/journal-entries', requirePermission(PERMISSIONS.ACCOUNTING.CREATE_JOURNAL), (req, res, next) => controller.createJournalEntry(req, res).catch(next));
router.post('/journal-entries/:id/reverse', requirePermission(PERMISSIONS.ACCOUNTING.REVERSE_JOURNAL), (req, res, next) => controller.reverseJournalEntry(req, res).catch(next));

// 3. General Ledger
router.get('/general-ledger', requirePermission(PERMISSIONS.ACCOUNTING.VIEW), (req, res, next) => controller.getGeneralLedger(req, res).catch(next));

// 4. Cash Registers & Banks
router.get('/cash-registers', requirePermission(PERMISSIONS.ACCOUNTING.VIEW), (req, res, next) => controller.listCashRegisters(req, res).catch(next));
router.post('/cash-registers', requirePermission(PERMISSIONS.ACCOUNTING.MANAGE_CASH), (req, res, next) => controller.createCashRegister(req, res).catch(next));
router.get('/bank-accounts', requirePermission(PERMISSIONS.ACCOUNTING.VIEW), (req, res, next) => controller.listBankAccounts(req, res).catch(next));
router.post('/bank-accounts', requirePermission(PERMISSIONS.ACCOUNTING.MANAGE_BANKS), (req, res, next) => controller.createBankAccount(req, res).catch(next));

// 5. Expenses
router.get('/expenses', requirePermission(PERMISSIONS.ACCOUNTING.VIEW), (req, res, next) => controller.listExpenses(req, res).catch(next));
router.post('/expenses', requirePermission(PERMISSIONS.ACCOUNTING.MANAGE_EXPENSES), (req, res, next) => controller.createExpense(req, res).catch(next));

// 6. Account Mappings
router.get('/mappings', requirePermission(PERMISSIONS.ACCOUNTING.MANAGE_MAPPINGS), (req, res, next) => controller.listAccountMappings(req, res).catch(next));
router.put('/mappings', requirePermission(PERMISSIONS.ACCOUNTING.MANAGE_MAPPINGS), (req, res, next) => controller.updateAccountMapping(req, res).catch(next));

// 7. Financial Statements & Reports
router.get('/reports/trial-balance', requirePermission(PERMISSIONS.ACCOUNTING.VIEW_REPORTS), (req, res, next) => controller.getTrialBalance(req, res).catch(next));
router.get('/reports/profit-and-loss', requirePermission(PERMISSIONS.ACCOUNTING.VIEW_REPORTS), (req, res, next) => controller.getProfitAndLoss(req, res).catch(next));
router.get('/reports/balance-sheet', requirePermission(PERMISSIONS.ACCOUNTING.VIEW_REPORTS), (req, res, next) => controller.getBalanceSheet(req, res).catch(next));
router.get('/reports/cash-flow', requirePermission(PERMISSIONS.ACCOUNTING.VIEW_REPORTS), (req, res, next) => controller.getCashFlow(req, res).catch(next));
router.get('/reports/profitability', requirePermission(PERMISSIONS.ACCOUNTING.VIEW_REPORTS), (req, res, next) => controller.getDetailedProfitability(req, res).catch(next));

// 8. Fiscal Years & Period Controls
router.get('/fiscal-years', requirePermission(PERMISSIONS.ACCOUNTING.MANAGE_PERIODS), (req, res, next) => controller.listFiscalYears(req, res).catch(next));
router.post('/periods/:id/close', requirePermission(PERMISSIONS.ACCOUNTING.MANAGE_PERIODS), (req, res, next) => controller.closePeriod(req, res).catch(next));
router.post('/periods/:id/reopen', requirePermission(PERMISSIONS.ACCOUNTING.MANAGE_PERIODS), (req, res, next) => controller.reopenPeriod(req, res).catch(next));

export default router;
