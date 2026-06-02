import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Account,
  Transaction,
  RecurringTransactionRule,
  RecurringTransactionFrequency,
  CategoryRule,
  CategoryRuleMatchType,
  MonthlyBudget,
  BudgetAlert,
  Loan,
  LoanScheduleEntry,
  LoanPayment,
  PersonalDebt,
  PersonalDebtPayment,
  Bill,
  BillInstance,
  CreditCard,
  CreditCardActivity,
  SavingsGoal,
  SavingsGoalContribution,
  FinanceDataState,
} from '@/types/finance';
import { addDays, addMonths, addWeeks, addYears, format, parseISO, isAfter } from 'date-fns';
import { applyLoanPaymentToSchedule, deriveLoanMonthlyInterestRate, getLoanRepaymentSchedule, getLoanTotalWithInterest } from '@/lib/interest';

// Generate a simple ID
const uid = () => Math.random().toString(36).slice(2, 10);

const today = new Date();
const thisMonth = today.getMonth();
const thisYear = today.getFullYear();
const currentMonthPrefix = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const toDate = (value: string) => parseISO(value);
const formatDate = (value: Date) => format(value, 'yyyy-MM-dd');
const getMonthKey = (value: Date | string) => {
  const date = typeof value === 'string' ? toDate(value) : value;
  return Number.isNaN(date.getTime()) ? null : format(date, 'yyyy-MM');
};
const normalizeBudgetCategory = (value: string) => value.trim().toLowerCase();
const splitList = (value?: string | string[]) => {
  const items = Array.isArray(value) ? value : String(value ?? '').split(/[,\n;]/);
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
};
const getTransactionCategories = (transaction: Transaction) => {
  const categories = splitList(transaction.categories);
  return categories.length > 0 ? categories : [transaction.category].filter(Boolean);
};

const normalizeCategoryName = (value: string) => value.trim();
const uniqueCategories = (values: string[]) => [...new Set(values.map(normalizeCategoryName).filter(Boolean))];
const sameCategory = (a: string, b: string) => normalizeCategoryName(a).toLowerCase() === normalizeCategoryName(b).toLowerCase();

const matchCategoryRule = (value: string, pattern: string, matchType: CategoryRuleMatchType) => {
  const normalizedValue = value.trim().toLowerCase();
  const normalizedPattern = pattern.trim().toLowerCase();
  if (!normalizedValue || !normalizedPattern) return false;
  if (matchType === 'equals') return normalizedValue === normalizedPattern;
  if (matchType === 'startsWith') return normalizedValue.startsWith(normalizedPattern);
  return normalizedValue.includes(normalizedPattern);
};

const inferCategoryFromRules = (tx: Pick<Transaction, 'description' | 'category'>, rules: CategoryRule[]) => {
  const haystacks = [tx.description, tx.category].filter(Boolean) as string[];
  const activeRules = rules.filter((rule) => rule.active);
  for (const haystack of haystacks) {
    for (const rule of activeRules) {
      if (matchCategoryRule(haystack, rule.pattern, rule.matchType)) {
        return rule.category;
      }
    }
  }
  return '';
};
const CATEGORY_COLOR_PALETTE = [
  '#22c55e',
  '#0ea5e9',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#6366f1',
  '#84cc16',
];
const hashCategory = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};
const ensureCategoryColors = (
  categories: string[],
  existingColors: Record<string, string>,
) => {
  const nextColors = { ...existingColors };
  const usedColors = new Set(Object.values(nextColors));

  categories.forEach((category) => {
    const normalized = category.trim();
    if (!normalized || nextColors[normalized]) return;

    const availableColor = CATEGORY_COLOR_PALETTE.find((color) => !usedColors.has(color));
    const color = availableColor ?? CATEGORY_COLOR_PALETTE[hashCategory(normalized) % CATEGORY_COLOR_PALETTE.length];
    nextColors[normalized] = color;
    usedColors.add(color);
  });

  return nextColors;
};

const getTransactionAccountEffects = (transaction: Transaction) => {
  const effects = new Map<string, number>();

  if (transaction.type === 'income') {
    effects.set(transaction.accountId, (effects.get(transaction.accountId) ?? 0) + transaction.amount);
    return effects;
  }

  if (transaction.type === 'expense') {
    effects.set(transaction.accountId, (effects.get(transaction.accountId) ?? 0) - transaction.amount);
    return effects;
  }

  effects.set(transaction.accountId, (effects.get(transaction.accountId) ?? 0) - transaction.amount);
  if (transaction.transferAccountId && transaction.transferAccountId !== transaction.accountId) {
    effects.set(transaction.transferAccountId, (effects.get(transaction.transferAccountId) ?? 0) + transaction.amount);
  }

  return effects;
};

const nextRecurringDate = (date: Date, frequency: RecurringTransactionFrequency, intervalDays?: number) => {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'biweekly':
      return addWeeks(date, 2);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
    case 'custom':
    default:
      return addDays(date, Math.max(1, intervalDays ?? 1));
  }
};

const normalizeBill = (bill: Partial<Bill> & { dueDay?: unknown }): Bill => {
  const dueDay = typeof bill.dueDay === 'number' ? bill.dueDay : Number(bill.dueDay);
  const fallbackDay = Number.isFinite(dueDay) && dueDay >= 1 && dueDay <= 31 ? dueDay : 1;
  const fallbackDueDate = `${currentMonthPrefix}-${String(fallbackDay).padStart(2, '0')}`;

  return {
    id: bill.id ?? uid(),
    name: bill.name ?? 'Untitled Bill',
    amount: typeof bill.amount === 'number' ? bill.amount : Number(bill.amount) || 0,
    category: bill.category ?? 'Other',
    dueDate: isIsoDate(bill.dueDate) ? bill.dueDate : fallbackDueDate,
    recurring: typeof bill.recurring === 'boolean' ? bill.recurring : true,
    frequency: (bill as Partial<Bill>).frequency ?? 'monthly',
    intervalDays: (bill as Partial<Bill>).intervalDays ?? undefined,
    active: typeof (bill as Partial<Bill>).active === 'boolean' ? (bill as Partial<Bill>).active : true,
    status: bill.status === 'paid' || bill.status === 'pending' || bill.status === 'overdue' ? bill.status : 'pending',
    paidDate: isIsoDate(bill.paidDate) ? bill.paidDate : undefined,
    lastPaidDate: isIsoDate((bill as any).lastPaidDate) ? (bill as any).lastPaidDate : undefined,
  };
};

const normalizeLoan = (loan: Partial<Loan> & { dueDate?: unknown; interestRate?: unknown }): Loan => {
  const scheduleSource = Array.isArray(loan.repaymentSchedule) ? loan.repaymentSchedule : [];
  const normalizedSchedule = getLoanRepaymentSchedule({
    totalAmount: typeof loan.totalAmount === 'number' ? loan.totalAmount : Number(loan.totalAmount) || 0,
    monthlyPayment: typeof loan.monthlyPayment === 'number' ? loan.monthlyPayment : Number(loan.monthlyPayment) || 0,
    startDate: isIsoDate(loan.startDate) ? loan.startDate : '',
    endDate: isIsoDate(loan.endDate)
      ? loan.endDate
      : isIsoDate(loan.dueDate)
        ? loan.dueDate
        : '',
    dueDay: typeof loan.dueDay === 'number' ? loan.dueDay : Number(loan.dueDay) || 1,
    repaymentSchedule: scheduleSource as Partial<LoanScheduleEntry>[],
  });
  const schedulePaidAmount = normalizedSchedule.reduce((sum, entry) => sum + entry.paidAmount, 0);
  const requestedPaidAmount = typeof loan.paidAmount === 'number' ? loan.paidAmount : Number(loan.paidAmount) || 0;
  const allocatedSchedule =
    requestedPaidAmount > schedulePaidAmount
      ? applyLoanPaymentToSchedule(normalizedSchedule, requestedPaidAmount - schedulePaidAmount).schedule
      : normalizedSchedule;
  const paidAmount =
    allocatedSchedule.length > 0
      ? allocatedSchedule.reduce((sum, entry) => sum + entry.paidAmount, 0)
      : requestedPaidAmount;
  const firstScheduleEntry = allocatedSchedule[0];
  const lastScheduleEntry = allocatedSchedule[allocatedSchedule.length - 1];
  const dueDayFromSchedule = firstScheduleEntry ? new Date(`${firstScheduleEntry.dueDate}T00:00:00`).getDate() : 1;
  const startDate = firstScheduleEntry?.dueDate ?? (isIsoDate(loan.startDate) ? loan.startDate : '');
  const endDate = lastScheduleEntry?.dueDate ?? (isIsoDate(loan.endDate) ? loan.endDate : isIsoDate(loan.dueDate) ? loan.dueDate : '');
  const averageMonthlyPayment =
    allocatedSchedule.length > 0
      ? allocatedSchedule.reduce((sum, entry) => sum + entry.amount, 0) / allocatedSchedule.length
      : typeof loan.monthlyPayment === 'number'
        ? loan.monthlyPayment
        : Number(loan.monthlyPayment) || 0;

  const normalizedLoan = {
    id: loan.id ?? uid(),
    name: loan.name ?? 'Untitled Loan',
    totalAmount: typeof loan.totalAmount === 'number' ? loan.totalAmount : Number(loan.totalAmount) || 0,
    paidAmount,
    monthlyPayment: averageMonthlyPayment,
    monthlyInterestRate:
      typeof loan.monthlyInterestRate === 'number'
        ? loan.monthlyInterestRate
        : typeof loan.interestRate === 'number'
          ? loan.interestRate
          : Number(loan.interestRate) || 0,
    startDate,
    dueDay: Number.isFinite(dueDayFromSchedule) ? Math.min(31, Math.max(1, dueDayFromSchedule)) : 1,
    endDate,
    repaymentSchedule: allocatedSchedule,
    type: loan.type === 'installment' ? 'installment' : 'loan',
  } satisfies Loan;

  return {
    ...normalizedLoan,
    monthlyInterestRate: deriveLoanMonthlyInterestRate(normalizedLoan),
  };
};

const normalizeCreditCard = (card: Partial<CreditCard>): CreditCard => ({
  id: card.id ?? uid(),
  name: card.name ?? 'Untitled Card',
  issuer: card.issuer ?? 'Unknown',
  network: card.network ?? 'other',
  creditLimit: typeof card.creditLimit === 'number' ? card.creditLimit : Number(card.creditLimit) || 0,
  paidAmount: typeof card.paidAmount === 'number' ? card.paidAmount : Number(card.paidAmount) || 0,
  currentBalance: typeof card.currentBalance === 'number' ? card.currentBalance : Number(card.currentBalance) || 0,
  statementBalance: typeof card.statementBalance === 'number' ? card.statementBalance : Number(card.statementBalance) || 0,
  minimumPayment: typeof card.minimumPayment === 'number' ? card.minimumPayment : Number(card.minimumPayment) || 0,
  monthlyInterestRate:
    typeof card.monthlyInterestRate === 'number'
      ? card.monthlyInterestRate
      : typeof card.apr === 'number'
        ? card.apr
        : Number(card.apr) || 0,
  rewardsRate: typeof card.rewardsRate === 'number' ? card.rewardsRate : Number(card.rewardsRate) || 0,
  annualFee: typeof card.annualFee === 'number' ? card.annualFee : Number(card.annualFee) || 0,
  dueDate: isIsoDate(card.dueDate) ? card.dueDate : '',
  statementCloseDate: isIsoDate(card.statementCloseDate) ? card.statementCloseDate : '',
  openedDate: isIsoDate(card.openedDate) ? card.openedDate : '',
  autopay: typeof card.autopay === 'boolean' ? card.autopay : false,
  rewardsPoints: typeof card.rewardsPoints === 'number' ? card.rewardsPoints : Number(card.rewardsPoints) || 0,
  lastPaymentDate: isIsoDate(card.lastPaymentDate) ? card.lastPaymentDate : undefined,
});

const normalizePersonalDebt = (debt: Partial<PersonalDebt>): PersonalDebt => {
  const amount = Math.max(0, typeof debt.amount === 'number' ? debt.amount : Number(debt.amount) || 0);
  const paidAmount = Math.min(amount, Math.max(0, typeof debt.paidAmount === 'number' ? debt.paidAmount : Number(debt.paidAmount) || 0));
  const createdAt = isIsoDate(debt.createdAt) ? debt.createdAt : new Date().toISOString().split('T')[0];
  const updatedAt = isIsoDate(debt.updatedAt) ? debt.updatedAt : createdAt;
  const status = debt.status === 'settled' || paidAmount >= amount ? 'settled' : 'active';

  return {
    id: debt.id ?? uid(),
    personName: debt.personName?.trim() || 'Unnamed person',
    direction: debt.direction === 'owedToMe' ? 'owedToMe' : 'iOwe',
    amount,
    paidAmount,
    dueDate: isIsoDate(debt.dueDate) ? debt.dueDate : undefined,
    note: debt.note?.trim() || undefined,
    createdAt,
    updatedAt,
    status,
  };
};

const initialAccounts: Account[] = [];

const initialTransactions: Transaction[] = [];
const initialRecurringTransactionRules: RecurringTransactionRule[] = [];
const initialCategoryRules: CategoryRule[] = [];
const initialTransactionCategories: string[] = [];
const initialSavingsCategories: string[] = [];
const initialSharedCategories: string[] = [];
const initialBudgets: MonthlyBudget[] = [];
const initialCategoryColors: Record<string, string> = {};

const initialLoans: Loan[] = [];

const initialPersonalDebts: PersonalDebt[] = [];

const initialPersonalDebtPayments: PersonalDebtPayment[] = [];

const initialCreditCards: CreditCard[] = [];

const initialCreditCardActivities: CreditCardActivity[] = [];

const initialSavingsGoals: SavingsGoal[] = [];

const initialSavingsGoalContributions: SavingsGoalContribution[] = [];

const initialBills: Bill[] = [];

type UndoEntryType =
  | 'deleteTransaction'
  | 'deleteBill'
  | 'deleteLoan'
  | 'deletePersonalDebt'
  | 'deleteCreditCard'
  | 'deleteSavingsGoal'
  | 'replace';

interface UndoEntry {
  id: string;
  type: UndoEntryType;
  // payload contains the previous object and index or full snapshot for replace
  payload: any;
  ts: string;
}

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  recurringTransactionRules: RecurringTransactionRule[];
  categoryRules: CategoryRule[];
  transactionCategories: string[];
  savingsCategories: string[];
  sharedCategories: string[];
  budgets: MonthlyBudget[];
  categoryColors: Record<string, string>;
  loans: Loan[];
  loanPayments: LoanPayment[];
  personalDebts: PersonalDebt[];
  personalDebtPayments: PersonalDebtPayment[];
  creditCards: CreditCard[];
  creditCardActivities: CreditCardActivity[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  savingsGoalContributions: SavingsGoalContribution[];
  currency: string;
  nickname: string;
  // lightweight undo history for destructive actions
  undoStack: UndoEntry[];
  // Account actions
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, data: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  
  // Transaction actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addRecurringTransactionRule: (rule: Omit<RecurringTransactionRule, 'id' | 'createdAt' | 'nextRunDate' | 'lastGeneratedDate'> & { nextRunDate?: string }) => void;
  updateRecurringTransactionRule: (id: string, data: Partial<RecurringTransactionRule>) => void;
  deleteRecurringTransactionRule: (id: string) => void;
  runRecurringTransactionScheduler: () => void;

  // Category actions
  addCategoryRule: (rule: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategoryRule: (id: string, data: Partial<CategoryRule>) => void;
  deleteCategoryRule: (id: string) => void;
  setCategoryColor: (category: string, color: string) => void;
  addTransactionCategory: (category: string) => void;
  addSavingsCategory: (category: string) => void;
  addSharedCategory: (category: string) => void;
  renameCategory: (scope: 'transaction' | 'savings', from: string, to: string) => void;
  deleteCategory: (scope: 'transaction' | 'savings', name: string) => void;

  // Budget actions
  addBudget: (budget: Omit<MonthlyBudget, 'id' | 'createdAt' | 'updatedAt' | 'lastWarningMonthKey' | 'lastExceededMonthKey'>) => void;
  updateBudget: (id: string, data: Partial<MonthlyBudget>) => void;
  deleteBudget: (id: string) => void;
  checkBudgetAlerts: () => BudgetAlert[];
  
  // Loan actions
  addLoan: (loan: Omit<Loan, 'id'>) => void;
  updateLoan: (id: string, data: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  logLoanPayment: (loanId: string, amount: number, note?: string) => void;

  // Personal debt actions
  addPersonalDebt: (debt: Omit<PersonalDebt, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: PersonalDebt['status'] }) => void;
  updatePersonalDebt: (id: string, data: Partial<PersonalDebt>) => void;
  deletePersonalDebt: (id: string) => void;
  logPersonalDebtPayment: (debtId: string, amount: number, note?: string) => void;

  // Credit card actions
  addCreditCard: (card: Omit<CreditCard, 'id'>) => void;
  updateCreditCard: (id: string, data: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  logCreditCardPayment: (cardId: string, amount: number, note?: string) => void;
  logCreditCardPurchase: (cardId: string, amount: number, note?: string) => void;
  
  // Bill actions
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, data: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string, paidDate?: string) => void;
  markBillUnpaid: (id: string) => void;

  // Savings goal actions
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'savedAmount'> & { savedAmount?: number }) => void;
  updateSavingsGoal: (id: string, data: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  addSavingsContribution: (goalId: string, amount: number, note?: string) => void;
  
  // Settings actions
  setCurrency: (currency: string) => void;
  setNickname: (nickname: string) => void;
  replaceFinanceData: (data: FinanceDataState) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      accounts: initialAccounts,
      transactions: initialTransactions,
      recurringTransactionRules: initialRecurringTransactionRules,
      categoryRules: initialCategoryRules,
      transactionCategories: initialTransactionCategories,
      savingsCategories: initialSavingsCategories,
      sharedCategories: initialSharedCategories,
      budgets: initialBudgets,
      categoryColors: initialCategoryColors,
      loans: initialLoans,
      loanPayments: [],
      personalDebts: initialPersonalDebts,
      personalDebtPayments: initialPersonalDebtPayments,
      creditCards: initialCreditCards,
      creditCardActivities: initialCreditCardActivities,
      bills: initialBills,
      savingsGoals: initialSavingsGoals,
      savingsGoalContributions: initialSavingsGoalContributions,
      currency: '₱',
      nickname: '',
      undoStack: [],

      addAccount: (account) => set((s) => ({ accounts: [...s.accounts, { ...account, id: uid() }] })),
      updateAccount: (id, data) => set((s) => ({ accounts: s.accounts.map((a) => a.id === id ? { ...a, ...data } : a) })),
      deleteAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      addTransaction: (tx) => set((s) => {
        const inferredCategory = inferCategoryFromRules(tx, s.categoryRules);
        const category = tx.category?.trim() || inferredCategory || 'Other';
        const categories = splitList(tx.categories).length > 0 ? splitList(tx.categories) : [category];
        const transferAccountId = tx.type === 'transfer' ? tx.transferAccountId : undefined;
        if (tx.type === 'transfer' && (!transferAccountId || transferAccountId === tx.accountId)) {
          return s;
        }
        const newTx = {
          ...tx,
          id: uid(),
          transferAccountId,
          category,
          categories,
          tags: splitList(tx.tags),
        };
        const accountEffects = getTransactionAccountEffects(newTx);
        const accounts = s.accounts.map((a) => {
          const delta = accountEffects.get(a.id);
          if (typeof delta === 'number' && delta !== 0) {
            return { ...a, balance: a.balance + delta };
          }
          return a;
        });
        return {
          transactions: [newTx, ...s.transactions],
          accounts,
          categoryColors: ensureCategoryColors(categories, s.categoryColors),
          transactionCategories: uniqueCategories([...(s.transactionCategories ?? []), ...categories]),
        };
      }),
      updateTransaction: (id, data) => set((s) => {
        const existing = s.transactions.find((tx) => tx.id === id);
        if (!existing) return s;
        const nextType = data.type || existing.type;
        const nextTransferAccountId =
          nextType === 'transfer'
            ? data.transferAccountId ?? existing.transferAccountId
            : undefined;
        if (nextType === 'transfer' && (!nextTransferAccountId || nextTransferAccountId === (data.accountId || existing.accountId))) {
          return s;
        }

        const nextTransaction: Transaction = {
          ...existing,
          ...data,
          category: data.category?.trim() || existing.category,
          categories: splitList(data.categories ?? existing.categories).length > 0
            ? splitList(data.categories ?? existing.categories)
            : [data.category?.trim() || existing.category],
          tags: splitList(data.tags ?? existing.tags),
          amount: typeof data.amount === 'number' ? data.amount : existing.amount,
          accountId: data.accountId || existing.accountId,
          transferAccountId: nextTransferAccountId,
          type: nextType,
          description: data.description ?? existing.description,
          date: data.date ?? existing.date,
        };
        const oldEffects = getTransactionAccountEffects(existing);
        const newEffects = getTransactionAccountEffects(nextTransaction);

        const accounts = s.accounts.map((account) => {
          const oldDelta = oldEffects.get(account.id) ?? 0;
          const newDelta = newEffects.get(account.id) ?? 0;
          if (oldDelta !== 0 || newDelta !== 0) {
            return {
              ...account,
              balance: account.balance - oldDelta + newDelta,
            };
          }
          return account;
        });
        const categories = nextTransaction.categories ?? [nextTransaction.category];

        return {
          transactions: s.transactions.map((tx) => (tx.id === id ? nextTransaction : tx)),
          accounts,
          categoryColors: ensureCategoryColors(categories, s.categoryColors),
        };
      }),
      deleteTransaction: (id) => set((s) => {
        const txIndex = s.transactions.findIndex((t) => t.id === id);
        const tx = s.transactions[txIndex];
        if (!tx) return s;
        const accountEffects = getTransactionAccountEffects(tx);
        const accounts = s.accounts.map((a) => {
          const delta = accountEffects.get(a.id);
          if (typeof delta === 'number' && delta !== 0) {
            return { ...a, balance: a.balance - delta };
          }
          return a;
        });

        const undoEntry: UndoEntry = {
          id: uid(),
          type: 'deleteTransaction',
          payload: { item: tx, index: txIndex },
          ts: new Date().toISOString(),
        };

        return {
          transactions: s.transactions.filter((t) => t.id !== id),
          accounts,
          undoStack: [undoEntry, ...(s.undoStack ?? [])].slice(0, 20),
        };
      }),
      addRecurringTransactionRule: (rule) => set((s) => {
        const startDate = rule.nextRunDate ?? rule.startDate;
        return {
          recurringTransactionRules: [
            ...s.recurringTransactionRules,
            {
              ...rule,
              id: uid(),
              createdAt: new Date().toISOString().split('T')[0],
              nextRunDate: startDate,
              lastGeneratedDate: undefined,
            },
          ],
        };
      }),
      updateRecurringTransactionRule: (id, data) => set((s) => ({
        recurringTransactionRules: s.recurringTransactionRules.map((rule) => (rule.id === id ? { ...rule, ...data } : rule)),
      })),
      deleteRecurringTransactionRule: (id) => set((s) => ({
        recurringTransactionRules: s.recurringTransactionRules.filter((rule) => rule.id !== id),
      })),
      runRecurringTransactionScheduler: () => set((s) => {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const transactions = [...s.transactions];
        const accounts = [...s.accounts];
        let categoryColors = { ...s.categoryColors };
        const nextRules = s.recurringTransactionRules.map((rule) => {
          if (!rule.active) return rule;

          let nextRun = toDate(rule.nextRunDate);
          const ruleEnd = rule.endDate ? toDate(rule.endDate) : null;
          const seen = new Set(
            transactions
              .filter((transaction) => transaction.recurringRuleId === rule.id)
              .map((transaction) => transaction.scheduledDate ?? transaction.date),
          );
          let safety = 0;

          while (!isAfter(nextRun, todayDate) && safety < 365) {
            if (!ruleEnd || !isAfter(nextRun, ruleEnd)) {
              const scheduledDate = formatDate(nextRun);
              if (!seen.has(scheduledDate)) {
                const newTx: Transaction = {
                  id: uid(),
                  accountId: rule.accountId,
                  type: rule.type,
                  amount: rule.amount,
                  category: rule.category,
                  categories: [rule.category],
                  tags: [],
                  description: rule.description,
                  date: scheduledDate,
                  recurringRuleId: rule.id,
                  scheduledDate,
                };
                transactions.unshift(newTx);
                seen.add(scheduledDate);
                accounts.forEach((account, index) => {
                  if (account.id === rule.accountId) {
                    accounts[index] = {
                      ...account,
                      balance: rule.type === 'income' ? account.balance + rule.amount : account.balance - rule.amount,
                    };
                  }
                });
                categoryColors = ensureCategoryColors([rule.category], categoryColors);
              }
            }

            nextRun = nextRecurringDate(nextRun, rule.frequency, rule.intervalDays);
            safety += 1;
          }

          return {
            ...rule,
            nextRunDate: formatDate(nextRun),
            lastGeneratedDate: formatDate(todayDate),
          };
        });

        return {
          transactions,
          accounts,
          recurringTransactionRules: nextRules,
          categoryColors,
        };
      }),

      addCategoryRule: (rule) => set((s) => {
        const now = new Date().toISOString();
        const nextRule: CategoryRule = {
          ...rule,
          id: uid(),
          createdAt: now,
          updatedAt: now,
          pattern: rule.pattern.trim(),
          category: rule.category.trim(),
        };
        return {
          categoryRules: [...s.categoryRules, nextRule],
          transactionCategories: uniqueCategories([...(s.transactionCategories ?? []), nextRule.category]),
          categoryColors: ensureCategoryColors([nextRule.category], s.categoryColors),
        };
      }),
      updateCategoryRule: (id, data) => set((s) => ({
        categoryRules: s.categoryRules.map((rule) => rule.id === id ? { ...rule, ...data, pattern: data.pattern?.trim() ?? rule.pattern, category: data.category?.trim() ?? rule.category, updatedAt: new Date().toISOString() } : rule),
        transactionCategories: data.category ? uniqueCategories([...(s.transactionCategories ?? []), data.category]) : s.transactionCategories,
        categoryColors: data.category ? ensureCategoryColors([data.category], s.categoryColors) : s.categoryColors,
      })),
      deleteCategoryRule: (id) => set((s) => ({ categoryRules: s.categoryRules.filter((rule) => rule.id !== id) })),
      setCategoryColor: (category, color) => set((s) => ({ categoryColors: { ...s.categoryColors, [category.trim()]: color } })),
      addTransactionCategory: (category) => set((s) => ({ transactionCategories: uniqueCategories([...s.transactionCategories, category]) })),
      addSavingsCategory: (category) => set((s) => ({ savingsCategories: uniqueCategories([...s.savingsCategories, category]) })),
      addSharedCategory: (category) => set((s) => ({ sharedCategories: uniqueCategories([...s.sharedCategories, category]) })),
      renameCategory: (scope, from, to) => set((s) => {
        const source = normalizeCategoryName(from);
        const target = normalizeCategoryName(to);
        if (!source || !target || sameCategory(source, target)) return s;

        if (scope === 'savings') {
          return {
            savingsCategories: uniqueCategories(s.savingsCategories.map((item) => sameCategory(item, source) ? target : item)),
            savingsGoals: s.savingsGoals.map((goal) => sameCategory(goal.category, source) ? { ...goal, category: target } : goal),
            categoryColors: Object.entries(s.categoryColors).reduce<Record<string, string>>((acc, [key, color]) => {
              if (sameCategory(key, source)) {
                acc[target] = color;
              } else {
                acc[key] = color;
              }
              return acc;
            }, {}),
          };
        }

        return {
          transactionCategories: uniqueCategories(s.transactionCategories.map((item) => sameCategory(item, source) ? target : item)),
          sharedCategories: uniqueCategories(s.sharedCategories.map((item) => sameCategory(item, source) ? target : item)),
          transactions: s.transactions.map((tx) => ({
            ...tx,
            category: sameCategory(tx.category, source) ? target : tx.category,
            categories: (tx.categories ?? []).map((item) => sameCategory(item, source) ? target : item),
          })),
          bills: s.bills.map((bill) => sameCategory(bill.category, source) ? { ...bill, category: target } : bill),
          budgets: s.budgets.map((budget) => sameCategory(budget.category, source) ? { ...budget, category: target } : budget),
          recurringTransactionRules: s.recurringTransactionRules.map((rule) => sameCategory(rule.category, source) ? { ...rule, category: target } : rule),
          categoryRules: s.categoryRules.map((rule) => sameCategory(rule.category, source) ? { ...rule, category: target, updatedAt: new Date().toISOString() } : rule),
          categoryColors: Object.entries(s.categoryColors).reduce<Record<string, string>>((acc, [key, color]) => {
            if (sameCategory(key, source)) {
              acc[target] = color;
            } else {
              acc[key] = color;
            }
            return acc;
          }, {}),
        };
      }),
      deleteCategory: (scope, name) => set((s) => {
        const target = normalizeCategoryName(name);
        if (!target) return s;

        if (scope === 'savings') {
          const nextColors = Object.fromEntries(Object.entries(s.categoryColors).filter(([key]) => !sameCategory(key, target)));
          return {
            savingsCategories: s.savingsCategories.filter((item) => !sameCategory(item, target)),
            savingsGoals: s.savingsGoals.map((goal) => sameCategory(goal.category, target) ? { ...goal, category: 'Other' } : goal),
            categoryColors: nextColors,
          };
        }

        const nextColors = Object.fromEntries(Object.entries(s.categoryColors).filter(([key]) => !sameCategory(key, target)));
        return {
          transactionCategories: s.transactionCategories.filter((item) => !sameCategory(item, target)),
          sharedCategories: s.sharedCategories.filter((item) => !sameCategory(item, target)),
          transactions: s.transactions.map((tx) => ({
            ...tx,
            category: sameCategory(tx.category, target) ? 'Other' : tx.category,
            categories: (tx.categories ?? []).map((item) => sameCategory(item, target) ? 'Other' : item),
          })),
          bills: s.bills.map((bill) => sameCategory(bill.category, target) ? { ...bill, category: 'Other' } : bill),
          budgets: s.budgets.map((budget) => sameCategory(budget.category, target) ? { ...budget, category: 'Other' } : budget),
          recurringTransactionRules: s.recurringTransactionRules.map((rule) => sameCategory(rule.category, target) ? { ...rule, category: 'Other' } : rule),
          categoryRules: s.categoryRules.map((rule) => sameCategory(rule.category, target) ? { ...rule, category: 'Other', updatedAt: new Date().toISOString() } : rule),
          categoryColors: nextColors,
        };
      }),

      addBudget: (budget) => set((s) => {
        const now = new Date().toISOString();
        const normalizedCategory = normalizeBudgetCategory(budget.category);
        const existingIndex = s.budgets.findIndex((item) => normalizeBudgetCategory(item.category) === normalizedCategory);
        const nextBudget: MonthlyBudget = {
          ...budget,
          id: uid(),
          createdAt: now,
          updatedAt: now,
          lastWarningMonthKey: undefined,
          lastExceededMonthKey: undefined,
        };

        if (existingIndex >= 0) {
          const budgets = [...s.budgets];
          budgets[existingIndex] = {
            ...budgets[existingIndex],
            ...nextBudget,
            id: budgets[existingIndex].id,
            createdAt: budgets[existingIndex].createdAt,
          };
          return { budgets };
        }

        return { budgets: [...s.budgets, nextBudget] };
      }),
      updateBudget: (id, data) => set((s) => ({
        budgets: s.budgets.map((budget) =>
          budget.id === id
            ? {
                ...budget,
                ...data,
                updatedAt: new Date().toISOString(),
                lastWarningMonthKey: undefined,
                lastExceededMonthKey: undefined,
              }
            : budget,
        ),
      })),
      deleteBudget: (id) => set((s) => ({
        budgets: s.budgets.filter((budget) => budget.id !== id),
      })),
      checkBudgetAlerts: () => {
        const currentMonthKey = getMonthKey(new Date()) ?? format(new Date(), 'yyyy-MM');
        const alerts: BudgetAlert[] = [];

        set((s) => {
          const expenseTotals = new Map<string, number>();
          s.transactions.forEach((transaction) => {
            if (transaction.type !== 'expense') return;
            const transactionMonthKey = getMonthKey(transaction.date);
            if (transactionMonthKey !== currentMonthKey) return;
            getTransactionCategories(transaction).forEach((category) => {
              const key = normalizeBudgetCategory(category);
              expenseTotals.set(key, (expenseTotals.get(key) ?? 0) + transaction.amount);
            });
          });

          const nextBudgets = s.budgets.map((budget) => {
            if (!budget.active) return budget;

            const limitAmount = Math.max(0, budget.limitAmount);
            if (limitAmount <= 0) return budget;

            const spent = expenseTotals.get(normalizeBudgetCategory(budget.category)) ?? 0;
            const thresholdPct = Math.min(100, Math.max(1, budget.alertThresholdPct || 80));
            const percent = (spent / limitAmount) * 100;

            if (spent >= limitAmount) {
              if (budget.lastExceededMonthKey !== currentMonthKey) {
                alerts.push({
                  budgetId: budget.id,
                  category: budget.category,
                  severity: 'over',
                  spent,
                  limitAmount,
                  thresholdPct,
                  monthKey: currentMonthKey,
                });
              }
              return {
                ...budget,
                lastExceededMonthKey: currentMonthKey,
                lastWarningMonthKey: currentMonthKey,
              };
            }

            if (percent >= thresholdPct) {
              if (budget.lastWarningMonthKey !== currentMonthKey) {
                alerts.push({
                  budgetId: budget.id,
                  category: budget.category,
                  severity: 'warning',
                  spent,
                  limitAmount,
                  thresholdPct,
                  monthKey: currentMonthKey,
                });
              }
              return {
                ...budget,
                lastWarningMonthKey: currentMonthKey,
              };
            }

            return budget;
          });

          return alerts.length > 0 ? { budgets: nextBudgets } : {};
        });

        return alerts;
      },

      addLoan: (loan) => set((s) => {
        const nextLoan = normalizeLoan({ ...loan, id: uid() });
        return { loans: [...s.loans, nextLoan] };
      }),
      updateLoan: (id, data) => set((s) => ({
        loans: s.loans.map((loan) => {
          if (loan.id !== id) return loan;
          return normalizeLoan({ ...loan, ...data, id });
        }),
      })),
      deleteLoan: (id) => set((s) => {
        const idx = s.loans.findIndex((l) => l.id === id);
        const item = s.loans[idx];
        if (!item) return s;
        const undoEntry: UndoEntry = { id: uid(), type: 'deleteLoan', payload: { item, index: idx }, ts: new Date().toISOString() };
        return { loans: s.loans.filter((l) => l.id !== id), undoStack: [undoEntry, ...(s.undoStack ?? [])].slice(0, 20) };
      }),
      logLoanPayment: (loanId, amount, note) => set((s) => {
        const payment: LoanPayment = { id: uid(), loanId, amount, date: new Date().toISOString().split('T')[0], note };
        const loans = s.loans.map((loan) => {
          if (loan.id !== loanId) return loan;
          const scheduleResult = applyLoanPaymentToSchedule(loan.repaymentSchedule, amount);
          const paidAmount = Math.min(getLoanTotalWithInterest(loan), loan.paidAmount + scheduleResult.appliedAmount);
          return {
            ...loan,
            paidAmount,
            repaymentSchedule: scheduleResult.schedule,
          };
        });
        return { loanPayments: [...s.loanPayments, payment], loans };
      }),

      addPersonalDebt: (debt) => set((s) => {
        const now = new Date().toISOString().split('T')[0];
        const nextDebt = normalizePersonalDebt({
          ...debt,
          id: uid(),
          createdAt: now,
          updatedAt: now,
        });
        return { personalDebts: [nextDebt, ...s.personalDebts] };
      }),
      updatePersonalDebt: (id, data) => set((s) => ({
        personalDebts: s.personalDebts.map((debt) => {
          if (debt.id !== id) return debt;
          return normalizePersonalDebt({
            ...debt,
            ...data,
            id,
            updatedAt: new Date().toISOString().split('T')[0],
          });
        }),
      })),
      deletePersonalDebt: (id) => set((s) => {
        const idx = s.personalDebts.findIndex((debt) => debt.id === id);
        const item = s.personalDebts[idx];
        if (!item) return s;
        const payments = s.personalDebtPayments.filter((payment) => payment.debtId === id);
        const undoEntry: UndoEntry = { id: uid(), type: 'deletePersonalDebt', payload: { item, index: idx, payments }, ts: new Date().toISOString() };
        return {
          personalDebts: s.personalDebts.filter((debt) => debt.id !== id),
          personalDebtPayments: s.personalDebtPayments.filter((payment) => payment.debtId !== id),
          undoStack: [undoEntry, ...(s.undoStack ?? [])].slice(0, 20),
        };
      }),
      logPersonalDebtPayment: (debtId, amount, note) => set((s) => {
        const debt = s.personalDebts.find((item) => item.id === debtId);
        if (!debt) return s;
        const remaining = Math.max(0, debt.amount - debt.paidAmount);
        const paymentAmount = Math.min(remaining, Math.max(0, amount));
        if (paymentAmount <= 0) return s;
        const date = new Date().toISOString().split('T')[0];
        const payment: PersonalDebtPayment = {
          id: uid(),
          debtId,
          amount: paymentAmount,
          date,
          note,
        };
        const personalDebts = s.personalDebts.map((item) => {
          if (item.id !== debtId) return item;
          return normalizePersonalDebt({
            ...item,
            paidAmount: item.paidAmount + paymentAmount,
            updatedAt: date,
          });
        });
        return {
          personalDebts,
          personalDebtPayments: [payment, ...s.personalDebtPayments],
        };
      }),

      addCreditCard: (card) => set((s) => ({ creditCards: [...s.creditCards, { ...card, id: uid() }] })),
      updateCreditCard: (id, data) => set((s) => ({
        creditCards: s.creditCards.map((card) => (card.id === id ? { ...card, ...data } : card)),
      })),
      deleteCreditCard: (id) => set((s) => {
        const idx = s.creditCards.findIndex((c) => c.id === id);
        const item = s.creditCards[idx];
        if (!item) return s;
        const activities = s.creditCardActivities.filter((activity) => activity.cardId === id);
        const undoEntry: UndoEntry = { id: uid(), type: 'deleteCreditCard', payload: { item, index: idx, activities }, ts: new Date().toISOString() };
        return {
          creditCards: s.creditCards.filter((card) => card.id !== id),
          creditCardActivities: s.creditCardActivities.filter((activity) => activity.cardId !== id),
          undoStack: [undoEntry, ...(s.undoStack ?? [])].slice(0, 20),
        };
      }),
      logCreditCardPayment: (cardId, amount, note) => set((s) => {
        const paymentAmount = Math.max(0, amount);
        const payment: CreditCardActivity = {
          id: uid(),
          cardId,
          type: 'payment',
          amount: paymentAmount,
          date: new Date().toISOString().split('T')[0],
          note,
        };
        const creditCards = s.creditCards.map((card) => {
          if (card.id !== cardId) return card;
          const applied = Math.min(paymentAmount, card.currentBalance);
          return {
            ...card,
            paidAmount: card.paidAmount + applied,
            currentBalance: Math.max(0, card.currentBalance - applied),
            statementBalance: Math.max(0, card.statementBalance - applied),
            minimumPayment: Math.max(0, card.minimumPayment - applied),
            rewardsPoints: card.rewardsPoints,
            openedDate: card.openedDate,
            lastPaymentDate: payment.date,
          };
        });
        return { creditCards, creditCardActivities: [payment, ...s.creditCardActivities] };
      }),
      logCreditCardPurchase: (cardId, amount, note) => set((s) => {
        const purchaseAmount = Math.max(0, amount);
        const activity: CreditCardActivity = {
          id: uid(),
          cardId,
          type: 'purchase',
          amount: purchaseAmount,
          date: new Date().toISOString().split('T')[0],
          note,
        };
        const creditCards = s.creditCards.map((card) => {
          if (card.id !== cardId) return card;
          return {
            ...card,
            currentBalance: card.currentBalance + purchaseAmount,
            statementBalance: card.statementBalance + purchaseAmount,
            rewardsPoints: card.rewardsPoints + Math.round(purchaseAmount * card.rewardsRate),
          };
        });
        return { creditCards, creditCardActivities: [activity, ...s.creditCardActivities] };
      }),

      addBill: (bill) => set((s) => ({ bills: [...s.bills, { ...bill, id: uid() }] })),
      updateBill: (id, data) => set((s) => ({ bills: s.bills.map((b) => b.id === id ? { ...b, ...data } : b) })),
      deleteBill: (id) => set((s) => {
        const idx = s.bills.findIndex((b) => b.id === id);
        const item = s.bills[idx];
        if (!item) return s;
        const undoEntry: UndoEntry = { id: uid(), type: 'deleteBill', payload: { item, index: idx }, ts: new Date().toISOString() };
        return { bills: s.bills.filter((b) => b.id !== id), undoStack: [undoEntry, ...(s.undoStack ?? [])].slice(0, 20) };
      }),
      markBillPaid: (id, paidDateArg) => set((s) => {
        const paidDate = typeof paidDateArg === 'string' && isIsoDate(paidDateArg) ? paidDateArg : new Date().toISOString().split('T')[0];
        const bills = s.bills.map((bill) => {
          if (bill.id !== id) return bill;

          // For recurring active bills, record the last paid date then advance its due date.
          if (bill.recurring && (bill as Partial<Bill>).active !== false) {
            try {
              const current = isIsoDate(bill.dueDate) ? toDate(bill.dueDate) : new Date();
              const freq = (bill as Partial<Bill>).frequency ?? 'monthly';
              const interval = (bill as Partial<Bill>).intervalDays ?? undefined;
              const nextDue = formatDate(nextRecurringDate(current, freq, interval));
              return {
                ...bill,
                // preserve a record of when this occurrence was paid
                lastPaidDate: paidDate,
                dueDate: nextDue,
                status: 'pending' as const,
                paidDate: undefined,
              };
            } catch {
              return {
                ...bill,
                status: 'paid' as const,
                paidDate,
              };
            }
          }

          return {
            ...bill,
            status: 'paid' as const,
            paidDate,
          };
        });

        return { bills };
      }),
      markBillUnpaid: (id) => set((s) => ({
        bills: s.bills.map((b) => b.id === id ? { ...b, status: 'pending' as const, paidDate: undefined } : b),
      })),

      addSavingsGoal: (goal) => set((s) => ({
        savingsGoals: [
          ...s.savingsGoals,
          {
            ...goal,
            id: uid(),
            createdAt: new Date().toISOString().split('T')[0],
            savedAmount: goal.savedAmount ?? 0,
          },
        ],
        savingsCategories: uniqueCategories([...(s.savingsCategories ?? []), goal.category]),
      })),
      updateSavingsGoal: (id, data) => set((s) => ({
        savingsGoals: s.savingsGoals.map((goal) => (goal.id === id ? { ...goal, ...data } : goal)),
        savingsCategories: data.category ? uniqueCategories([...(s.savingsCategories ?? []), data.category]) : s.savingsCategories,
      })),
      deleteSavingsGoal: (id) => set((s) => {
        const idx = s.savingsGoals.findIndex((g) => g.id === id);
        const item = s.savingsGoals[idx];
        if (!item) return s;
        const contributions = s.savingsGoalContributions.filter((c) => c.goalId === id);
        const undoEntry: UndoEntry = { id: uid(), type: 'deleteSavingsGoal', payload: { item, index: idx, contributions }, ts: new Date().toISOString() };
        return {
          savingsGoals: s.savingsGoals.filter((goal) => goal.id !== id),
          savingsGoalContributions: s.savingsGoalContributions.filter((contribution) => contribution.goalId !== id),
          undoStack: [undoEntry, ...(s.undoStack ?? [])].slice(0, 20),
        };
      }),
      addSavingsContribution: (goalId, amount, note) => set((s) => {
        const contributionAmount = Math.max(0, amount);
        const date = new Date().toISOString().split('T')[0];
        const contribution: SavingsGoalContribution = {
          id: uid(),
          goalId,
          amount: contributionAmount,
          date,
          note,
        };

        const savingsGoals = s.savingsGoals.map((goal) => {
          if (goal.id !== goalId) return goal;
          const savedAmount = goal.savedAmount + contributionAmount;
          const completedAt = savedAmount >= goal.targetAmount && !goal.completedAt ? date : goal.completedAt;
          return {
            ...goal,
            savedAmount,
            completedAt,
          };
        });

        return {
          savingsGoals,
          savingsGoalContributions: [contribution, ...s.savingsGoalContributions],
        };
      }),

      setCurrency: (currency) => set({ currency }),
      setNickname: (nickname) => set({ nickname: nickname.trim() }),
      // pushUndoEntry defined above

      undoLast: () => set((s) => {
        const entry = (s.undoStack && s.undoStack.length > 0) ? s.undoStack[0] : undefined;
        if (!entry) return s;

        const remaining = s.undoStack.slice(1);

        const insertAt = <T,>(arr: T[], index: number, item: T) => {
          const clamped = Math.max(0, Math.min(index, arr.length));
          return [...arr.slice(0, clamped), item, ...arr.slice(clamped)];
        };

        switch (entry.type) {
          case 'deleteTransaction': {
            const tx = entry.payload.item as Transaction;
            const accounts = s.accounts.map((a) => {
              const delta = getTransactionAccountEffects(tx).get(a.id) ?? 0;
              if (delta !== 0) return { ...a, balance: a.balance + delta };
              return a;
            });
            return {
              transactions: insertAt(s.transactions, entry.payload.index ?? 0, tx),
              accounts,
              undoStack: remaining,
            } as Partial<FinanceState> as any;
          }
          case 'deleteBill': {
            const bill = entry.payload.item as Bill;
            return { bills: insertAt(s.bills, entry.payload.index ?? 0, bill), undoStack: remaining } as any;
          }
          case 'deleteLoan': {
            const loan = entry.payload.item as Loan;
            return { loans: insertAt(s.loans, entry.payload.index ?? 0, loan), undoStack: remaining } as any;
          }
          case 'deletePersonalDebt': {
            const debt = entry.payload.item as PersonalDebt;
            const payments = entry.payload.payments as PersonalDebtPayment[];
            return {
              personalDebts: insertAt(s.personalDebts, entry.payload.index ?? 0, debt),
              personalDebtPayments: [...payments, ...s.personalDebtPayments],
              undoStack: remaining,
            } as any;
          }
          case 'deleteCreditCard': {
            const card = entry.payload.item as CreditCard;
            const activities = entry.payload.activities as CreditCardActivity[];
            return {
              creditCards: insertAt(s.creditCards, entry.payload.index ?? 0, card),
              creditCardActivities: [...activities, ...s.creditCardActivities],
              undoStack: remaining,
            } as any;
          }
          case 'deleteSavingsGoal': {
            const goal = entry.payload.item as SavingsGoal;
            const contributions = entry.payload.contributions as SavingsGoalContribution[];
            return {
              savingsGoals: insertAt(s.savingsGoals, entry.payload.index ?? 0, goal),
              savingsGoalContributions: [...contributions, ...s.savingsGoalContributions],
              undoStack: remaining,
            } as any;
          }
          case 'replace': {
            // restore previous full snapshot
            const previous = entry.payload.previous as FinanceDataState;
            // use the existing replaceFinanceData helper if available
            const fn = (get as any)().replaceFinanceData;
            if (typeof fn === 'function') {
              // call outside of set to avoid nested set
              set(() => ({ undoStack: remaining }));
              fn(previous as any);
              return s;
            }
            return s;
          }
          default:
            return { undoStack: remaining } as any;
        }
      }),

      pushUndoEntry: (entry) => set((s) => ({ undoStack: [entry, ...(s.undoStack ?? [])].slice(0, 20) })),

      replaceFinanceData: (data) => set((s) => {
        const previous: FinanceDataState = {
          accounts: s.accounts,
          transactions: s.transactions,
          recurringTransactionRules: s.recurringTransactionRules,
          categoryRules: s.categoryRules,
          transactionCategories: s.transactionCategories,
          savingsCategories: s.savingsCategories,
          sharedCategories: s.sharedCategories,
          budgets: s.budgets,
          categoryColors: s.categoryColors,
          loans: s.loans,
          loanPayments: s.loanPayments,
          personalDebts: s.personalDebts,
          personalDebtPayments: s.personalDebtPayments,
          creditCards: s.creditCards,
          creditCardActivities: s.creditCardActivities,
          bills: s.bills,
          savingsGoals: s.savingsGoals,
          savingsGoalContributions: s.savingsGoalContributions,
          currency: s.currency,
        };

        const undoEntry: UndoEntry = { id: uid(), type: 'replace', payload: { previous }, ts: new Date().toISOString() };

        return {
          accounts: data.accounts,
          transactions: data.transactions,
          recurringTransactionRules: (data as FinanceDataState & { recurringTransactionRules?: RecurringTransactionRule[] }).recurringTransactionRules ?? [],
          categoryRules: (data as FinanceDataState & { categoryRules?: CategoryRule[] }).categoryRules ?? [],
          transactionCategories: (data as FinanceDataState & { transactionCategories?: string[] }).transactionCategories ?? [],
          savingsCategories: (data as FinanceDataState & { savingsCategories?: string[] }).savingsCategories ?? [],
          sharedCategories: (data as FinanceDataState & { sharedCategories?: string[] }).sharedCategories ?? [],
          budgets: (data as FinanceDataState & { budgets?: MonthlyBudget[] }).budgets ?? [],
          categoryColors: (data as FinanceDataState & { categoryColors?: Record<string, string> }).categoryColors ?? {},
          loans: data.loans.map((loan) => normalizeLoan(loan)),
          loanPayments: data.loanPayments,
          personalDebts: ((data as FinanceDataState & { personalDebts?: PersonalDebt[] }).personalDebts ?? []).map((debt) => normalizePersonalDebt(debt)),
          personalDebtPayments: (data as FinanceDataState & { personalDebtPayments?: PersonalDebtPayment[] }).personalDebtPayments ?? [],
          creditCards: data.creditCards.map((card) => normalizeCreditCard(card)),
          creditCardActivities: data.creditCardActivities,
          bills: data.bills,
          savingsGoals: data.savingsGoals,
          savingsGoalContributions: data.savingsGoalContributions,
          currency: data.currency,
          undoStack: [undoEntry, ...(s.undoStack ?? [])].slice(0, 20),
        };
      }),
      mergeFinanceData: (data) => set((s) => {
        const mergeById = <T extends { id: string }>(existing: T[], incoming: T[], normalize?: (item: any) => T) => {
          const existingIds = new Set(existing.map((i) => i.id));
          const toAdd: T[] = [];
          incoming.forEach((item) => {
            const normalized = normalize ? normalize(item) : (item as T);
            const id = (normalized as any).id ?? uid();
            if (!existingIds.has(id)) {
              toAdd.push({ ...normalized, id } as T);
            }
          });
          return [...existing, ...toAdd];
        };

        return {
          accounts: mergeById(s.accounts, data.accounts ?? []),
          transactions: mergeById(s.transactions, data.transactions ?? []),
          recurringTransactionRules: mergeById(s.recurringTransactionRules, data.recurringTransactionRules ?? []),
          categoryRules: mergeById(s.categoryRules, (data as FinanceDataState & { categoryRules?: CategoryRule[] }).categoryRules ?? []),
          transactionCategories: uniqueCategories([...(s.transactionCategories ?? []), ...((data as FinanceDataState & { transactionCategories?: string[] }).transactionCategories ?? [])]),
          savingsCategories: uniqueCategories([...(s.savingsCategories ?? []), ...((data as FinanceDataState & { savingsCategories?: string[] }).savingsCategories ?? [])]),
          sharedCategories: uniqueCategories([...(s.sharedCategories ?? []), ...((data as FinanceDataState & { sharedCategories?: string[] }).sharedCategories ?? [])]),
          budgets: mergeById(s.budgets, data.budgets ?? []),
          categoryColors: Object.keys(data.categoryColors ?? {}).reduce((acc, key) => {
            if (!acc[key]) acc[key] = (data.categoryColors as Record<string, string>)[key];
            return acc;
          }, { ...s.categoryColors }),
          loans: mergeById(s.loans, (data.loans ?? []).map((l) => normalizeLoan(l as Partial<typeof l>))),
          loanPayments: mergeById(s.loanPayments, data.loanPayments ?? []),
          personalDebts: mergeById(
            s.personalDebts,
            (((data as FinanceDataState & { personalDebts?: PersonalDebt[] }).personalDebts ?? []).map((debt) => normalizePersonalDebt(debt))),
          ),
          personalDebtPayments: mergeById(
            s.personalDebtPayments,
            (data as FinanceDataState & { personalDebtPayments?: PersonalDebtPayment[] }).personalDebtPayments ?? [],
          ),
          creditCards: mergeById(s.creditCards, (data.creditCards ?? []).map((c) => normalizeCreditCard(c as Partial<typeof c>))),
          creditCardActivities: mergeById(s.creditCardActivities, data.creditCardActivities ?? []),
          bills: mergeById(s.bills, (data.bills ?? []).map((b) => normalizeBill(b as Partial<typeof b>))),
          savingsGoals: mergeById(s.savingsGoals, data.savingsGoals ?? []),
          savingsGoalContributions: mergeById(s.savingsGoalContributions, data.savingsGoalContributions ?? []),
          currency: s.currency || data.currency || '₱',
        };
      }),
    }),
    {
      name: 'finbo-storage',
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<FinanceState> | undefined;
        if (!state?.bills) return persistedState;

        return {
          ...state,
          recurringTransactionRules: state.recurringTransactionRules ?? [],
          categoryRules: state.categoryRules ?? [],
          transactionCategories: state.transactionCategories ?? [],
          savingsCategories: state.savingsCategories ?? [],
          sharedCategories: state.sharedCategories ?? [],
          budgets: state.budgets ?? [],
          categoryColors: state.categoryColors ?? {},
          loans: state.loans?.map((loan) => normalizeLoan(loan)) ?? [],
          personalDebts: state.personalDebts?.map((debt) => normalizePersonalDebt(debt)) ?? [],
          personalDebtPayments: state.personalDebtPayments ?? [],
          bills: state.bills.map((bill) => normalizeBill(bill as Partial<Bill> & { dueDay?: unknown })),
          creditCards: state.creditCards?.map((card) => normalizeCreditCard(card)) ?? [],
        };
      },
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<FinanceState> | undefined;
        if (!typedState?.bills) {
          return { ...currentState, ...typedState };
        }

        return {
          ...currentState,
          ...typedState,
          recurringTransactionRules: typedState.recurringTransactionRules ?? currentState.recurringTransactionRules,
          categoryRules: typedState.categoryRules ?? currentState.categoryRules,
          transactionCategories: typedState.transactionCategories ?? currentState.transactionCategories,
          savingsCategories: typedState.savingsCategories ?? currentState.savingsCategories,
          sharedCategories: typedState.sharedCategories ?? currentState.sharedCategories,
          budgets: typedState.budgets ?? currentState.budgets,
          categoryColors: typedState.categoryColors ?? currentState.categoryColors,
          loans: typedState.loans?.map((loan) => normalizeLoan(loan)) ?? currentState.loans,
          personalDebts: typedState.personalDebts?.map((debt) => normalizePersonalDebt(debt)) ?? currentState.personalDebts,
          personalDebtPayments: typedState.personalDebtPayments ?? currentState.personalDebtPayments,
          bills: typedState.bills.map((bill) => normalizeBill(bill as Partial<Bill> & { dueDay?: unknown })),
          creditCards: typedState.creditCards?.map((card) => normalizeCreditCard(card)) ?? currentState.creditCards,
        };
      },
    }
  )
);
