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
  type: 'income' | 'expense' | 'transfer';
  transferAccountId?: string;
  amount: number;
  category: string;
  categories?: string[];
  description: string;
  date: string;
  tags?: string[];
  recurringRuleId?: string;
  scheduledDate?: string;
}

export type RecurringTransactionFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurringTransactionRule {
  id: string;
  label: string;
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  frequency: RecurringTransactionFrequency;
  intervalDays?: number;
  startDate: string;
  nextRunDate: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
  lastGeneratedDate?: string;
}

export type BudgetAlertSeverity = 'warning' | 'over';

export interface MonthlyBudget {
  id: string;
  category: string;
  limitAmount: number;
  alertThresholdPct: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastWarningMonthKey?: string;
  lastExceededMonthKey?: string;
}

export interface BudgetAlert {
  budgetId: string;
  category: string;
  severity: BudgetAlertSeverity;
  spent: number;
  limitAmount: number;
  thresholdPct: number;
  monthKey: string;
}

export interface LoanScheduleEntry {
  id: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
}

export interface Loan {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  monthlyPayment: number;
  monthlyInterestRate: number;
  startDate: string;
  dueDay: number;
  endDate: string;
  repaymentSchedule: LoanScheduleEntry[];
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
  paidAmount: number;
  currentBalance: number;
  statementBalance: number;
  minimumPayment: number;
  monthlyInterestRate: number;
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
  frequency?: RecurringTransactionFrequency;
  intervalDays?: number;
  active?: boolean;
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

export interface FinanceDataState {
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
}

export interface FinanceBackupSnapshot {
  version: 1;
  exportedAt: string;
  data: FinanceDataState;
}
