import { create } from 'zustand';
import type { Account, Transaction, Loan, LoanPayment, Bill, BillInstance } from '@/types/finance';

// Generate a simple ID
const uid = () => Math.random().toString(36).slice(2, 10);

const today = new Date();
const thisMonth = today.getMonth();
const thisYear = today.getFullYear();

const initialAccounts: Account[] = [
  { id: 'acc1', name: 'Main Bank', type: 'bank', balance: 12450.00, currency: 'USD', color: 'hsl(172, 66%, 40%)' },
  { id: 'acc2', name: 'Cash Wallet', type: 'cash', balance: 340.00, currency: 'USD', color: 'hsl(38, 92%, 50%)' },
  { id: 'acc3', name: 'PayPal', type: 'e-wallet', balance: 1280.50, currency: 'USD', color: 'hsl(220, 70%, 55%)' },
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

const initialBills: Bill[] = [
  { id: 'b1', name: 'Netflix', amount: 15.99, category: 'Entertainment', dueDay: 15, recurring: true, status: 'paid', paidDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-15` },
  { id: 'b2', name: 'Electric Bill', amount: 85, category: 'Utilities', dueDay: 5, recurring: true, status: 'paid' },
  { id: 'b3', name: 'Internet', amount: 59.99, category: 'Utilities', dueDay: 20, recurring: true, status: 'pending' },
  { id: 'b4', name: 'Gym Membership', amount: 30, category: 'Health', dueDay: 1, recurring: true, status: 'paid' },
  { id: 'b5', name: 'Phone Plan', amount: 45, category: 'Utilities', dueDay: 25, recurring: true, status: 'pending' },
  { id: 'b6', name: 'Insurance', amount: 150, category: 'Insurance', dueDay: 10, recurring: true, status: 'overdue' },
];

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  bills: Bill[];
  
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
  
  // Bill actions
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, data: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string) => void;
  markBillUnpaid: (id: string) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  accounts: initialAccounts,
  transactions: initialTransactions,
  loans: initialLoans,
  loanPayments: [],
  bills: initialBills,

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

  addBill: (bill) => set((s) => ({ bills: [...s.bills, { ...bill, id: uid() }] })),
  updateBill: (id, data) => set((s) => ({ bills: s.bills.map((b) => b.id === id ? { ...b, ...data } : b) })),
  deleteBill: (id) => set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),
  markBillPaid: (id) => set((s) => ({
    bills: s.bills.map((b) => b.id === id ? { ...b, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] } : b),
  })),
  markBillUnpaid: (id) => set((s) => ({
    bills: s.bills.map((b) => b.id === id ? { ...b, status: 'pending' as const, paidDate: undefined } : b),
  })),
}));
