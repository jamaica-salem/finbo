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

export type CreditCardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'unionpay' | 'other';

export interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  network: CreditCardNetwork;
  creditLimit: number;
  currentBalance: number;
  statementBalance: number;
  minimumPayment: number;
  apr: number;
  rewardsRate: number;
  annualFee: number;
  dueDate: string;
  statementCloseDate: string;
  openedDate: string;
  autopay: boolean;
  rewardsPoints: number;
  lastPaymentDate?: string;
}

export interface CreditCardActivity {
  id: string;
  cardId: string;
  type: 'payment' | 'purchase';
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
  dueDate: string;
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

export type SavingsGoalCategory = 'Vacation' | 'Emergency Fund' | 'Home' | 'Education' | 'Tech' | 'Other';

export interface SavingsGoal {
  id: string;
  name: string;
  category: SavingsGoalCategory;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  createdAt: string;
  completedAt?: string;
  note?: string;
}

export interface SavingsGoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  note?: string;
}
