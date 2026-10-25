import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AccountingService } from './accounting.service';
import { sendSuccess, sendPaginated } from '../../utils/response';

const service = new AccountingService();

export class AccountingController {
  // --- Initialize & Chart of Accounts ---
  async listAccounts(req: AuthenticatedRequest, res: Response) {
    const accounts = await service.listAccounts(req.user!.organizationId, req.query);
    sendSuccess(res, accounts);
  }

  async getAccountById(req: AuthenticatedRequest, res: Response) {
    const account = await service.getAccountById(req.params.id as string);
    sendSuccess(res, account);
  }

  async createAccount(req: AuthenticatedRequest, res: Response) {
    const account = await service.createAccount(req.user!.organizationId, req.body);
    sendSuccess(res, account, 201);
  }

  async updateAccount(req: AuthenticatedRequest, res: Response) {
    const account = await service.updateAccount(req.params.id as string, req.body);
    sendSuccess(res, account);
  }

  // --- Journal Entries ---
  async listJournalEntries(req: AuthenticatedRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const { total, data } = await service.listJournalEntries(req.user!.organizationId, {
      ...req.query,
      skip,
      limit,
    });
    sendPaginated(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  async createJournalEntry(req: AuthenticatedRequest, res: Response) {
    const entry = await service.createJournalEntry(req.user!.organizationId, {
      ...req.body,
      userId: req.user!.userId,
    });
    sendSuccess(res, entry, 201);
  }

  async reverseJournalEntry(req: AuthenticatedRequest, res: Response) {
    const entry = await service.reverseJournalEntry(
      req.params.id as string,
      req.body.reason || 'إلغاء قيد محاسبي',
      req.user!.userId
    );
    sendSuccess(res, entry);
  }

  // --- General Ledger ---
  async getGeneralLedger(req: AuthenticatedRequest, res: Response) {
    const ledger = await service.getGeneralLedger(req.user!.organizationId, req.query);
    sendSuccess(res, ledger);
  }

  // --- Cash Registers & Banks ---
  async listCashRegisters(req: AuthenticatedRequest, res: Response) {
    const cash = await service.listCashRegisters(req.user!.organizationId, req.query.branchId as string);
    sendSuccess(res, cash);
  }

  async createCashRegister(req: AuthenticatedRequest, res: Response) {
    const cash = await service.createCashRegister(req.user!.organizationId, req.body);
    sendSuccess(res, cash, 201);
  }

  async listBankAccounts(req: AuthenticatedRequest, res: Response) {
    const banks = await service.listBankAccounts(req.user!.organizationId, req.query.branchId as string);
    sendSuccess(res, banks);
  }

  async createBankAccount(req: AuthenticatedRequest, res: Response) {
    const bank = await service.createBankAccount(req.user!.organizationId, req.body);
    sendSuccess(res, bank, 201);
  }

  // --- Expenses ---
  async listExpenses(req: AuthenticatedRequest, res: Response) {
    const expenses = await service.listExpenses(req.user!.organizationId, req.query);
    sendSuccess(res, expenses);
  }

  async createExpense(req: AuthenticatedRequest, res: Response) {
    const expense = await service.createExpense(req.user!.organizationId, req.body, req.user!.userId);
    sendSuccess(res, expense, 201);
  }

  // --- Account Mappings ---
  async listAccountMappings(req: AuthenticatedRequest, res: Response) {
    const mappings = await service.listAccountMappings(req.user!.organizationId);
    sendSuccess(res, mappings);
  }

  async updateAccountMapping(req: AuthenticatedRequest, res: Response) {
    const mapping = await service.updateAccountMapping(
      req.user!.organizationId,
      req.body.mappingKey,
      req.body.accountId
    );
    sendSuccess(res, mapping);
  }

  // --- Financial Statements & Reports ---
  async getTrialBalance(req: AuthenticatedRequest, res: Response) {
    const tb = await service.getTrialBalance(req.user!.organizationId, req.query);
    sendSuccess(res, tb);
  }

  async getProfitAndLoss(req: AuthenticatedRequest, res: Response) {
    const pnl = await service.getProfitAndLoss(req.user!.organizationId, req.query);
    sendSuccess(res, pnl);
  }

  async getBalanceSheet(req: AuthenticatedRequest, res: Response) {
    const bs = await service.getBalanceSheet(req.user!.organizationId, req.query);
    sendSuccess(res, bs);
  }

  async getCashFlow(req: AuthenticatedRequest, res: Response) {
    const cf = await service.getCashFlow(req.user!.organizationId, req.query);
    sendSuccess(res, cf);
  }

  // --- Fiscal Years & Periods ---
  async listFiscalYears(req: AuthenticatedRequest, res: Response) {
    const years = await service.listFiscalYears(req.user!.organizationId);
    sendSuccess(res, years);
  }

  async closePeriod(req: AuthenticatedRequest, res: Response) {
    const period = await service.closeAccountingPeriod(req.params.id as string, req.user!.userId);
    sendSuccess(res, period);
  }

  async reopenPeriod(req: AuthenticatedRequest, res: Response) {
    const period = await service.reopenAccountingPeriod(req.params.id as string);
    sendSuccess(res, period);
  }

  // --- Granular Profitability Engine ---
  async getDetailedProfitability(req: AuthenticatedRequest, res: Response) {
    const profitability = await service.getDetailedProfitability(req.user!.organizationId, req.query);
    sendSuccess(res, profitability);
  }
}
