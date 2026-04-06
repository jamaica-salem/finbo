import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Account,
  Transaction,
  Loan,
  LoanPayment,
  Bill,
  BillInstance,
  CreditCard,
  CreditCardActivity,
  SavingsGoal,
  SavingsGoalContribution,
} from '@/types/finance';

// Generate a simple ID
const uid = () => Math.random().toString(36).slice(2, 10);

const today = new Date();
const thisMonth = today.getMonth();
const thisYear = today.getFullYear();
const currentMonthPrefix = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

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

const initialAccounts: Account[] = [];

const initialTransactions: Transaction[] = [];

const initialLoans: Loan[] = [];

const initialCreditCards: CreditCard[] = [];

const initialCreditCardActivities: CreditCardActivity[] = [];

const initialSavingsGoals: SavingsGoal[] = [];

const initialSavingsGoalContributions: SavingsGoalContribution[] = [];

const initialBills: Bill[] = [];

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
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
  deleteTransaction: (id: string) => void;
  
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
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
  accounts: initialAccounts,
  transactions: initialTransactions,
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
    const newTx = { ...tx, id: uid() };
    const accounts = s.accounts.map((a) => {
      if (a.id === tx.accountId) {
        return { ...a, balance: tx.type === 'income' ? a.balance + tx.amount : a.balance - tx.amount };
      }
      return a;
    });
    return { transactions: [newTx, ...s.transactions], accounts };
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

  addLoan: (loan) => set((s) => ({ loans: [...s.loans, { ...loan, id: uid() }] })),
  updateLoan: (id, data) => set((s) => ({ loans: s.loans.map((l) => l.id === id ? { ...l, ...data } : l) })),
  deleteLoan: (id) => set((s) => ({ loans: s.loans.filter((l) => l.id !== id) })),
  logLoanPayment: (loanId, amount, note) => set((s) => {
    const payment: LoanPayment = { id: uid(), loanId, amount, date: new Date().toISOString().split('T')[0], note };
    const loans = s.loans.map((l) => l.id === loanId ? { ...l, paidAmount: l.paidAmount + amount } : l);
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
    }),
    {
      name: 'finbo-storage',
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<FinanceState> | undefined;
        if (!state?.bills) return persistedState;

        return {
          ...state,
          bills: state.bills.map((bill) => normalizeBill(bill as Partial<Bill> & { dueDay?: unknown })),
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
          bills: typedState.bills.map((bill) => normalizeBill(bill as Partial<Bill> & { dueDay?: unknown })),
        };
      },
    }
  )
);
