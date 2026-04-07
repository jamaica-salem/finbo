import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Account,
  Transaction,
  RecurringTransactionRule,
  RecurringTransactionFrequency,
  MonthlyBudget,
  BudgetAlert,
  Loan,
  LoanScheduleEntry,
  LoanPayment,
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
    status: bill.status === 'paid' || bill.status === 'pending' || bill.status === 'overdue' ? bill.status : 'pending',
    paidDate: isIsoDate(bill.paidDate) ? bill.paidDate : undefined,
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

const initialAccounts: Account[] = [];

const initialTransactions: Transaction[] = [];
const initialRecurringTransactionRules: RecurringTransactionRule[] = [];
const initialBudgets: MonthlyBudget[] = [];
const initialCategoryColors: Record<string, string> = {};

const initialLoans: Loan[] = [];

const initialCreditCards: CreditCard[] = [];

const initialCreditCardActivities: CreditCardActivity[] = [];

const initialSavingsGoals: SavingsGoal[] = [];

const initialSavingsGoalContributions: SavingsGoalContribution[] = [];

const initialBills: Bill[] = [];

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  recurringTransactionRules: RecurringTransactionRule[];
  budgets: MonthlyBudget[];
  categoryColors: Record<string, string>;
  loans: Loan[];
  loanPayments: LoanPayment[];
  creditCards: CreditCard[];
  creditCardActivities: CreditCardActivity[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  savingsGoalContributions: SavingsGoalContribution[];
  currency: string;
  
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
  markBillPaid: (id: string) => void;
  markBillUnpaid: (id: string) => void;

  // Savings goal actions
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'savedAmount'> & { savedAmount?: number }) => void;
  updateSavingsGoal: (id: string, data: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  addSavingsContribution: (goalId: string, amount: number, note?: string) => void;
  
  // Settings actions
  setCurrency: (currency: string) => void;
  replaceFinanceData: (data: FinanceDataState) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      accounts: initialAccounts,
      transactions: initialTransactions,
      recurringTransactionRules: initialRecurringTransactionRules,
      budgets: initialBudgets,
      categoryColors: initialCategoryColors,
      loans: initialLoans,
      loanPayments: [],
      creditCards: initialCreditCards,
      creditCardActivities: initialCreditCardActivities,
      bills: initialBills,
      savingsGoals: initialSavingsGoals,
      savingsGoalContributions: initialSavingsGoalContributions,
      currency: '₱',

      addAccount: (account) => set((s) => ({ accounts: [...s.accounts, { ...account, id: uid() }] })),
      updateAccount: (id, data) => set((s) => ({ accounts: s.accounts.map((a) => a.id === id ? { ...a, ...data } : a) })),
      deleteAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      addTransaction: (tx) => set((s) => {
        const categories = splitList(tx.categories).length > 0 ? splitList(tx.categories) : [tx.category];
        const newTx = {
          ...tx,
          id: uid(),
          categories,
          tags: splitList(tx.tags),
        };
        const accounts = s.accounts.map((a) => {
          if (a.id === tx.accountId) {
            return { ...a, balance: tx.type === 'income' ? a.balance + tx.amount : a.balance - tx.amount };
          }
          return a;
        });
        return {
          transactions: [newTx, ...s.transactions],
          accounts,
          categoryColors: ensureCategoryColors(categories, s.categoryColors),
        };
      }),
      updateTransaction: (id, data) => set((s) => {
        const existing = s.transactions.find((tx) => tx.id === id);
        if (!existing) return s;

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
          type: data.type || existing.type,
          description: data.description ?? existing.description,
          date: data.date ?? existing.date,
        };

        const oldAccountId = existing.accountId;
        const newAccountId = nextTransaction.accountId;
        const oldEffect = existing.type === 'income' ? existing.amount : -existing.amount;
        const newEffect = nextTransaction.type === 'income' ? nextTransaction.amount : -nextTransaction.amount;

        const accounts = s.accounts.map((account) => {
          if (account.id === oldAccountId && account.id === newAccountId) {
            return {
              ...account,
              balance: account.balance - oldEffect + newEffect,
            };
          }
          if (account.id === oldAccountId) {
            return {
              ...account,
              balance: account.balance - oldEffect,
            };
          }
          if (account.id === newAccountId) {
            return {
              ...account,
              balance: account.balance + newEffect,
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
        const tx = s.transactions.find((t) => t.id === id);
        if (!tx) return s;
        const accounts = s.accounts.map((a) => {
          if (a.id === tx.accountId) {
            return { ...a, balance: tx.type === 'income' ? a.balance - tx.amount : a.balance + tx.amount };
          }
          return a;
        });
        return { transactions: s.transactions.filter((t) => t.id !== id), accounts };
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
      deleteLoan: (id) => set((s) => ({ loans: s.loans.filter((l) => l.id !== id) })),
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

      addCreditCard: (card) => set((s) => ({ creditCards: [...s.creditCards, { ...card, id: uid() }] })),
      updateCreditCard: (id, data) => set((s) => ({
        creditCards: s.creditCards.map((card) => (card.id === id ? { ...card, ...data } : card)),
      })),
      deleteCreditCard: (id) => set((s) => ({
        creditCards: s.creditCards.filter((card) => card.id !== id),
        creditCardActivities: s.creditCardActivities.filter((activity) => activity.cardId !== id),
      })),
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
      deleteBill: (id) => set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),
      markBillPaid: (id) => set((s) => ({
        bills: s.bills.map((b) => b.id === id ? { ...b, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] } : b),
      })),
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
      })),
      updateSavingsGoal: (id, data) => set((s) => ({
        savingsGoals: s.savingsGoals.map((goal) => (goal.id === id ? { ...goal, ...data } : goal)),
      })),
      deleteSavingsGoal: (id) => set((s) => ({
        savingsGoals: s.savingsGoals.filter((goal) => goal.id !== id),
        savingsGoalContributions: s.savingsGoalContributions.filter((contribution) => contribution.goalId !== id),
      })),
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
      replaceFinanceData: (data) => set({
        accounts: data.accounts,
        transactions: data.transactions,
        recurringTransactionRules: (data as FinanceDataState & { recurringTransactionRules?: RecurringTransactionRule[] }).recurringTransactionRules ?? [],
        budgets: (data as FinanceDataState & { budgets?: MonthlyBudget[] }).budgets ?? [],
        categoryColors: (data as FinanceDataState & { categoryColors?: Record<string, string> }).categoryColors ?? {},
        loans: data.loans.map((loan) => normalizeLoan(loan)),
        loanPayments: data.loanPayments,
        creditCards: data.creditCards.map((card) => normalizeCreditCard(card)),
        creditCardActivities: data.creditCardActivities,
        bills: data.bills,
        savingsGoals: data.savingsGoals,
        savingsGoalContributions: data.savingsGoalContributions,
        currency: data.currency,
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
          budgets: state.budgets ?? [],
          categoryColors: state.categoryColors ?? {},
          loans: state.loans?.map((loan) => normalizeLoan(loan)) ?? [],
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
          budgets: typedState.budgets ?? currentState.budgets,
          categoryColors: typedState.categoryColors ?? currentState.categoryColors,
          loans: typedState.loans?.map((loan) => normalizeLoan(loan)) ?? currentState.loans,
          bills: typedState.bills.map((bill) => normalizeBill(bill as Partial<Bill> & { dueDay?: unknown })),
          creditCards: typedState.creditCards?.map((card) => normalizeCreditCard(card)) ?? currentState.creditCards,
        };
      },
    }
  )
);
