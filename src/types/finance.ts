export type AccountType = 'bank' | 'cash' | 'e-wallet';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Loan {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  monthlyPayment: number;
  interestRate: number;
  startDate: string;
  dueDate: string;
  type: 'loan' | 'installment';
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  note?: string;
}

export type BillStatus = 'paid' | 'pending' | 'overdue';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDay: number;
  recurring: boolean;
  status: BillStatus;
  paidDate?: string;
}

export interface BillInstance {
  id: string;
  billId: string;
  name: string;
  amount: number;
  category: string;
  dueDate: string;
  status: BillStatus;
  paidDate?: string;
}
