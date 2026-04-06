import { addDays, format } from 'date-fns';
import type {
  Account,
  Bill,
  CreditCard,
  FinanceDataState,
  Loan,
  MonthlyBudget,
  RecurringTransactionRule,
  SavingsGoal,
  Transaction,
} from '@/types/finance';
import { CATEGORY_COLOR_PALETTE } from '@/lib/transactionCategories';

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const today = new Date();
const isoDaysAgo = (days: number) => format(addDays(today, -days), 'yyyy-MM-dd');
const isoDaysFromNow = (days: number) => format(addDays(today, days), 'yyyy-MM-dd');

const assignColors = (categories: string[]) =>
  categories.reduce<Record<string, string>>((map, category, index) => {
    map[category] = CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length];
    return map;
  }, {});

export const generateSampleFinanceData = (currency = '₱'): FinanceDataState => {
  const accounts: Account[] = [
    { id: uid('acc'), name: 'Main Bank', type: 'bank', balance: 52480, currency, color: '#0ea5e9' },
    { id: uid('acc'), name: 'Daily Wallet', type: 'e-wallet', balance: 4280, currency, color: '#22c55e' },
  ];

  const transactions: Transaction[] = [
    {
      id: uid('tx'),
      accountId: accounts[0].id,
      type: 'income',
      amount: 45000,
      category: 'Salary',
      categories: ['Salary'],
      description: 'Monthly salary',
      date: isoDaysAgo(4),
      tags: ['payday'],
    },
    {
      id: uid('tx'),
      accountId: accounts[1].id,
      type: 'expense',
      amount: 1680,
      category: 'Food',
      categories: ['Food', 'Groceries'],
      description: 'Weekly groceries',
      date: isoDaysAgo(2),
      tags: ['family'],
    },
    {
      id: uid('tx'),
      accountId: accounts[1].id,
      type: 'expense',
      amount: 540,
      category: 'Transport',
      categories: ['Transport'],
      description: 'Ride share and commute',
      date: isoDaysAgo(1),
      tags: ['work'],
    },
    {
      id: uid('tx'),
      accountId: accounts[0].id,
      type: 'expense',
      amount: 12000,
      category: 'Rent',
      categories: ['Rent'],
      description: 'Monthly rent',
      date: isoDaysAgo(6),
      tags: ['fixed'],
    },
    {
      id: uid('tx'),
      accountId: accounts[0].id,
      type: 'expense',
      amount: 2200,
      category: 'Utilities',
      categories: ['Utilities'],
      description: 'Electricity and internet',
      date: isoDaysAgo(8),
      tags: ['bills'],
    },
    {
      id: uid('tx'),
      accountId: accounts[1].id,
      type: 'expense',
      amount: 2400,
      category: 'Shopping',
      categories: ['Shopping'],
      description: 'Clothes and essentials',
      date: isoDaysAgo(10),
      tags: ['personal'],
    },
    {
      id: uid('tx'),
      accountId: accounts[0].id,
      type: 'income',
      amount: 8000,
      category: 'Freelance',
      categories: ['Freelance'],
      description: 'Side project payment',
      date: isoDaysAgo(12),
      tags: ['extra'],
    },
  ];

  const recurringTransactionRules: RecurringTransactionRule[] = [
    {
      id: uid('rr'),
      label: 'Monthly Salary',
      accountId: accounts[0].id,
      type: 'income',
      amount: 45000,
      category: 'Salary',
      description: 'Recurring salary deposit',
      frequency: 'monthly',
      startDate: isoDaysAgo(30),
      nextRunDate: isoDaysFromNow(2),
      active: true,
      createdAt: isoDaysAgo(30),
      lastGeneratedDate: isoDaysAgo(4),
    },
  ];

  const budgets: MonthlyBudget[] = [
    {
      id: uid('bd'),
      category: 'Food',
      limitAmount: 9000,
      alertThresholdPct: 80,
      active: true,
      createdAt: isoDaysAgo(30),
      updatedAt: isoDaysAgo(3),
    },
    {
      id: uid('bd'),
      category: 'Transport',
      limitAmount: 4000,
      alertThresholdPct: 80,
      active: true,
      createdAt: isoDaysAgo(30),
      updatedAt: isoDaysAgo(3),
    },
  ];

  const loans: Loan[] = [
    {
      id: uid('loan'),
      name: 'Motor Loan',
      totalAmount: 180000,
      paidAmount: 42000,
      monthlyPayment: 12000,
      interestRate: 7.5,
      startDate: isoDaysAgo(260),
      dueDate: isoDaysFromNow(12),
      type: 'loan',
    },
  ];

  const creditCards: CreditCard[] = [
    {
      id: uid('cc'),
      name: 'Rewards Visa',
      issuer: 'Finbo Bank',
      network: 'visa',
      creditLimit: 50000,
      currentBalance: 8400,
      statementBalance: 9200,
      minimumPayment: 2500,
      apr: 3.25,
      rewardsRate: 1.2,
      annualFee: 1500,
      dueDate: isoDaysFromNow(9),
      statementCloseDate: isoDaysFromNow(4),
      openedDate: isoDaysAgo(420),
      autopay: false,
      rewardsPoints: 1840,
      lastPaymentDate: isoDaysAgo(18),
    },
  ];

  const bills: Bill[] = [
    {
      id: uid('bill'),
      name: 'Internet',
      amount: 1899,
      category: 'Utilities',
      dueDate: isoDaysFromNow(5),
      recurring: true,
      status: 'pending',
    },
    {
      id: uid('bill'),
      name: 'Streaming',
      amount: 499,
      category: 'Entertainment',
      dueDate: isoDaysFromNow(14),
      recurring: true,
      status: 'pending',
    },
  ];

  const savingsGoals: SavingsGoal[] = [
    {
      id: uid('goal'),
      name: 'Emergency Fund',
      category: 'Emergency Fund',
      targetAmount: 100000,
      savedAmount: 28000,
      targetDate: isoDaysFromNow(180),
      createdAt: isoDaysAgo(70),
      note: 'Build a 6-month safety net.',
    },
  ];

  const categoryColors = assignColors([
    'Salary',
    'Food',
    'Groceries',
    'Transport',
    'Rent',
    'Utilities',
    'Shopping',
    'Freelance',
    'Entertainment',
    'Emergency Fund',
  ]);

  return {
    accounts,
    transactions,
    recurringTransactionRules,
    budgets,
    categoryColors,
    loans,
    loanPayments: [],
    creditCards,
    creditCardActivities: [],
    bills,
    savingsGoals,
    savingsGoalContributions: [],
    currency,
  };
};
