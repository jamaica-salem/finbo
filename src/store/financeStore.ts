import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account, Transaction, Loan, LoanPayment, Bill, BillInstance, CreditCard, CreditCardActivity } from '@/types/finance';

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

const initialAccounts: Account[] = [
  { id: 'acc1', name: 'Main Bank', type: 'bank', balance: 0, currency: 'USD', color: 'hsl(172, 66%, 40%)' },
  { id: 'acc2', name: 'Cash Wallet', type: 'cash', balance: 0, currency: 'USD', color: 'hsl(38, 92%, 50%)' },
  { id: 'acc3', name: 'PayPal', type: 'e-wallet', balance: 0, currency: 'USD', color: 'hsl(220, 70%, 55%)' },
];

const initialTransactions: Transaction[] = [
  { id: 't1', accountId: 'acc1', type: 'income', amount: 4500, category: 'Salary', description: 'Monthly salary', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01` },
  { id: 't2', accountId: 'acc1', type: 'expense', amount: 1200, category: 'Rent', description: 'Monthly rent', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-03` },
  { id: 't3', accountId: 'acc1', type: 'expense', amount: 85, category: 'Utilities', description: 'Electric bill', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-05` },
  { id: 't4', accountId: 'acc2', type: 'expense', amount: 45, category: 'Food', description: 'Groceries', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-06` },
  { id: 't5', accountId: 'acc3', type: 'income', amount: 200, category: 'Freelance', description: 'Design project', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-08` },
  { id: 't6', accountId: 'acc1', type: 'expense', amount: 120, category: 'Shopping', description: 'Clothing', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-10` },
  { id: 't7', accountId: 'acc2', type: 'expense', amount: 32, category: 'Transport', description: 'Fuel', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-12` },
  { id: 't8', accountId: 'acc1', type: 'expense', amount: 65, category: 'Entertainment', description: 'Streaming', date: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-14` },
];

const initialLoans: Loan[] = [
  { id: 'l1', name: 'Car Loan', totalAmount: 25000, paidAmount: 8500, monthlyPayment: 450, interestRate: 4.5, startDate: '2023-06-01', dueDate: '2028-06-01', type: 'loan' },
  { id: 'l2', name: 'MacBook Pro', totalAmount: 2400, paidAmount: 1600, monthlyPayment: 200, interestRate: 0, startDate: '2024-01-01', dueDate: '2025-01-01', type: 'installment' },
  { id: 'l3', name: 'Home Renovation', totalAmount: 15000, paidAmount: 3000, monthlyPayment: 500, interestRate: 3.2, startDate: '2024-06-01', dueDate: '2027-06-01', type: 'loan' },
];

const initialCreditCards: CreditCard[] = [
  {
    id: 'cc1',
    name: 'Everyday Visa',
    issuer: 'Finbo Bank',
    network: 'visa',
    creditLimit: 50000,
    currentBalance: 12480,
    statementBalance: 12480,
    minimumPayment: 400,
    apr: 24.9,
    rewardsRate: 1.5,
    annualFee: 0,
    dueDate: '2026-04-20',
    statementCloseDate: '2026-04-15',
    openedDate: '2023-03-01',
    autopay: true,
    rewardsPoints: 18720,
  },
  {
    id: 'cc2',
    name: 'Travel Mastercard',
    issuer: 'Metro Card',
    network: 'mastercard',
    creditLimit: 120000,
    currentBalance: 28150,
    statementBalance: 28150,
    minimumPayment: 900,
    apr: 20.5,
    rewardsRate: 2.0,
    annualFee: 2500,
    dueDate: '2026-04-24',
    statementCloseDate: '2026-04-18',
    openedDate: '2022-11-12',
    autopay: false,
    rewardsPoints: 46600,
  },
];

const initialCreditCardActivities: CreditCardActivity[] = [];

const initialBills: Bill[] = [
  { id: 'b1', name: 'Netflix', amount: 15.99, category: 'Entertainment', dueDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-15`, recurring: true, status: 'paid', paidDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-15` },
  { id: 'b2', name: 'Electric Bill', amount: 85, category: 'Utilities', dueDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-05`, recurring: true, status: 'paid' },
  { id: 'b3', name: 'Internet', amount: 59.99, category: 'Utilities', dueDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-20`, recurring: true, status: 'pending' },
  { id: 'b4', name: 'Gym Membership', amount: 30, category: 'Health', dueDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01`, recurring: true, status: 'paid' },
  { id: 'b5', name: 'Phone Plan', amount: 45, category: 'Utilities', dueDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-25`, recurring: true, status: 'pending' },
  { id: 'b6', name: 'Insurance', amount: 150, category: 'Insurance', dueDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-10`, recurring: true, status: 'overdue' },
];

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  creditCards: CreditCard[];
  creditCardActivities: CreditCardActivity[];
  bills: Bill[];
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
