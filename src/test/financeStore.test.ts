import { describe, it, expect, beforeEach } from 'vitest';
import { useFinanceStore } from '@/store/financeStore';
import { format } from 'date-fns';
import { addMonths } from 'date-fns';

const todayKey = () => new Date().toISOString().split('T')[0];

beforeEach(() => {
  useFinanceStore.getState().replaceFinanceData({
    accounts: [],
    transactions: [],
    recurringTransactionRules: [],
    categoryRules: [],
    transactionCategories: [],
    savingsCategories: [],
    sharedCategories: [],
    budgets: [],
    categoryColors: {},
    loans: [],
    loanPayments: [],
    creditCards: [],
    creditCardActivities: [],
    bills: [],
    savingsGoals: [],
    savingsGoalContributions: [],
    currency: '₱',
  });
});

describe('finance store - core flows', () => {
  it('updates account balances for income/expense/transfer', () => {
    const add = () => useFinanceStore.getState();
    add().addAccount({ name: 'A', type: 'bank', balance: 100, currency: '₱', color: '#000' });
    add().addAccount({ name: 'B', type: 'bank', balance: 50, currency: '₱', color: '#000' });

    const accounts = add().accounts;
    const [a, b] = accounts;
    expect(a.balance).toBe(100);
    expect(b.balance).toBe(50);

    add().addTransaction({ accountId: a.id, type: 'income', amount: 25, category: 'Test', description: '', date: todayKey() });
    expect(useFinanceStore.getState().accounts.find(x => x.id === a.id)!.balance).toBe(125);

    add().addTransaction({ accountId: a.id, type: 'expense', amount: 10, category: 'Food', description: '', date: todayKey() });
    expect(useFinanceStore.getState().accounts.find(x => x.id === a.id)!.balance).toBe(115);

    add().addTransaction({ accountId: a.id, type: 'transfer', transferAccountId: b.id, amount: 20, category: 'Xfer', description: '', date: todayKey() });
    expect(useFinanceStore.getState().accounts.find(x => x.id === a.id)!.balance).toBe(95);
    expect(useFinanceStore.getState().accounts.find(x => x.id === b.id)!.balance).toBe(70);
  });

  it('generates recurring transactions and updates balances', () => {
    const st = () => useFinanceStore.getState();
    st().addAccount({ name: 'R', type: 'bank', balance: 1000, currency: '₱', color: '#000' });
    const acct = st().accounts[0];

    st().addRecurringTransactionRule({
      label: 'Sub',
      accountId: acct.id,
      type: 'expense',
      amount: 50,
      category: 'Subscription',
      description: 'monthly sub',
      frequency: 'monthly',
      startDate: todayKey(),
      nextRunDate: todayKey(),
      active: true,
    });

    st().runRecurringTransactionScheduler();

    // rule added
    const rule = st().recurringTransactionRules.find(r => r.label === 'Sub');
    expect(rule).toBeDefined();

    // transaction created
    const tx = st().transactions.find(t => t.recurringRuleId === rule!.id);
    expect(tx).toBeDefined();

    // account balance decremented
    const updated = st().accounts.find(a => a.id === acct.id)!;
    expect(updated.balance).toBe(1000 - 50);
  });

  it('rolls recurring bill due date in-place when marked paid', () => {
    const st = () => useFinanceStore.getState();
    const due = todayKey();
    st().addBill({ name: 'Rent', amount: 500, category: 'Housing', dueDate: due, recurring: true, frequency: 'monthly', status: 'pending' });
    const bill = st().bills.find(b => b.name === 'Rent')!;
    expect(bill).toBeTruthy();

    st().markBillPaid(bill.id);

    // same recurring bill should move to next month without creating duplicates
    const nextMonth = format(addMonths(new Date(due), 1), 'yyyy-MM-dd');
    const recurringBills = st().bills.filter((b) => b.name === 'Rent' && b.recurring);
    expect(recurringBills.length).toBe(1);
    expect(recurringBills[0].dueDate).toBe(nextMonth);
    expect(recurringBills[0].status).toBe('pending');
    expect((recurringBills[0] as any).frequency).toBe('monthly');
  });

  it('logs loan payments and updates loan paid amount', () => {
    const st = () => useFinanceStore.getState();
    const schedule = [{ id: 'r1', dueDate: todayKey(), amount: 100, paidAmount: 0 }];
    st().addLoan({ name: 'L1', totalAmount: 100, paidAmount: 0, monthlyPayment: 100, monthlyInterestRate: 0, startDate: todayKey(), dueDay: 1, endDate: todayKey(), repaymentSchedule: schedule, type: 'loan' });
    const loan = st().loans.find(l => l.name === 'L1')!;

    st().logLoanPayment(loan.id, 50, 'partial');

    const updatedLoan = st().loans.find(l => l.id === loan.id)!;
    expect(updatedLoan.paidAmount).toBeGreaterThan(0);
    expect(st().loanPayments.length).toBe(1);
  });

  it('replaceFinanceData restores snapshot', () => {
    const st = () => useFinanceStore.getState();
    const snapshot = {
      accounts: [{ id: 'a1', name: 'Snap', type: 'bank', balance: 10, currency: '₱', color: '#000' }],
      transactions: [],
      recurringTransactionRules: [],
      budgets: [],
      categoryColors: {},
      loans: [],
      loanPayments: [],
      creditCards: [],
      creditCardActivities: [],
      bills: [],
      savingsGoals: [],
      savingsGoalContributions: [],
      currency: '₱',
    };

    st().replaceFinanceData(snapshot as any);
    expect(st().accounts.length).toBe(1);
    expect(st().accounts[0].name).toBe('Snap');
  });
});
