import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PhilippinePeso, Receipt, TrendingUp, CreditCard, CalendarClock, Plus, Square } from 'lucide-react';
import { useFinanceStore } from '@/store/financeStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { buildTransactionCategoryOptions, getCategoryColor } from '@/lib/transactionCategories';
import { getLoanRepaymentSchedule, getLoanTotalWithInterest } from '@/lib/interest';
import { DUE_ITEM_BADGE_LABELS, getDueItems, settleDueItem, type DueItem } from '@/lib/dueItems';

const formatDueDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const getCategories = (transaction: { category: string; categories?: string[] }) =>
  (transaction.categories && transaction.categories.length > 0 ? transaction.categories : [transaction.category]).filter(Boolean);

const parseLocalDate = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isDateInMonth = (value: string, monthStart: Date) => {
  const date = parseLocalDate(value);
  return Boolean(date && date.getFullYear() === monthStart.getFullYear() && date.getMonth() === monthStart.getMonth());
};

const addRecurringInterval = (date: Date, frequency: string, intervalDays?: number) => {
  const next = new Date(date);

  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (frequency === 'biweekly') {
    next.setDate(next.getDate() + 14);
    return next;
  }
  if (frequency === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  if (frequency === 'custom') {
    next.setDate(next.getDate() + Math.max(1, intervalDays || 1));
    return next;
  }

  next.setMonth(next.getMonth() + 1);
  return next;
};

const getRecurringExpenseDueThisMonth = (
  rules: Array<{
    active: boolean;
    type: 'income' | 'expense';
    amount: number;
    frequency: string;
    intervalDays?: number;
    startDate: string;
    nextRunDate: string;
    endDate?: string;
  }>,
  monthStart: Date,
) => {
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  return rules
    .filter((rule) => rule.active && rule.type === 'expense')
    .reduce((sum, rule) => {
      const firstDueDate = parseLocalDate(rule.nextRunDate || rule.startDate);
      if (!firstDueDate) return sum;

      const endDate = parseLocalDate(rule.endDate || '');
      let cursor = new Date(firstDueDate);
      let occurrences = 0;
      let guard = 0;

      while (cursor < monthStart && guard < 800) {
        cursor = addRecurringInterval(cursor, rule.frequency, rule.intervalDays);
        guard += 1;
      }

      while (cursor <= monthEnd && (!endDate || cursor <= endDate) && guard < 800) {
        occurrences += 1;
        cursor = addRecurringInterval(cursor, rule.frequency, rule.intervalDays);
        guard += 1;
      }

      return sum + Math.max(0, rule.amount) * occurrences;
    }, 0);
};

export default function Dashboard() {
  const {
    accounts,
    transactions,
    loans,
    bills,
    creditCards,
    personalDebts,
    recurringTransactionRules,
    currency,
    categoryColors,
    transactionCategories,
    sharedCategories,
    nickname,
    addTransaction,
    addBill,
    logLoanPayment,
    logCreditCardPayment,
    logPersonalDebtPayment,
    markBillPaid,
  } = useFinanceStore();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [qeAccount, setQeAccount] = useState(accounts[0]?.id ?? '');
  const [qeAmount, setQeAmount] = useState('0');
  const [qeCategory, setQeCategory] = useState('');
  const [qeDate, setQeDate] = useState(new Date().toISOString().slice(0, 10));

  const [showAddIncome, setShowAddIncome] = useState(false);
  const [qiAccount, setQiAccount] = useState(accounts[0]?.id ?? '');
  const [qiAmount, setQiAmount] = useState('0');
  const [qiCategory, setQiCategory] = useState('');
  const [qiDate, setQiDate] = useState(new Date().toISOString().slice(0, 10));

  const [showAddBillQuick, setShowAddBillQuick] = useState(false);
  const [qbName, setQbName] = useState('');
  const [qbAmount, setQbAmount] = useState('0');
  const [qbCategory, setQbCategory] = useState('');
  const [qbDueDate, setQbDueDate] = useState(new Date().toISOString().slice(0, 10));

  const [showLogPayment, setShowLogPayment] = useState(false);
  const [lpType, setLpType] = useState<'loan' | 'creditCard' | 'bill'>('loan');
  const [lpLoanId, setLpLoanId] = useState(loans[0]?.id ?? '');
  const [lpCardId, setLpCardId] = useState(creditCards[0]?.id ?? '');
  const [lpBillId, setLpBillId] = useState(bills[0]?.id ?? '');
  const [lpAmount, setLpAmount] = useState('0');
  const [lpNote, setLpNote] = useState('');
  const [lpBillDate, setLpBillDate] = useState(new Date().toISOString().slice(0, 10));

  const categoryOptions = useMemo(
    () => buildTransactionCategoryOptions(transactions, transactionCategories, sharedCategories),
    [transactions, transactionCategories, sharedCategories]
  );

  const handleAddExpenseQuick = () => {
    if (!qeAccount) {
      toast.error('Select an account first');
      return;
    }

    const amount = Math.abs(parseFloat(qeAmount) || 0);
    if (amount <= 0) {
      toast.error('Enter an amount greater than 0');
      return;
    }

    addTransaction({
      accountId: qeAccount,
      type: 'expense',
      amount,
      category: qeCategory || 'Other',
      categories: qeCategory ? [qeCategory] : ['Other'],
      description: '',
      date: qeDate,
    });

    setShowAddExpense(false);
    setQeAmount('0');
    setQeCategory('');
    toast.success('Expense added');
  };

  const handleAddIncomeQuick = () => {
    if (!qiAccount) {
      toast.error('Select an account first');
      return;
    }

    const amount = Math.abs(parseFloat(qiAmount) || 0);
    if (amount <= 0) {
      toast.error('Enter an amount greater than 0');
      return;
    }

    addTransaction({
      accountId: qiAccount,
      type: 'income',
      amount,
      category: qiCategory || 'Other',
      categories: qiCategory ? [qiCategory] : ['Other'],
      description: '',
      date: qiDate,
    });

    setShowAddIncome(false);
    setQiAmount('0');
    setQiCategory('');
    toast.success('Income added');
  };

  const handleAddBillQuick = () => {
    const amount = Math.abs(parseFloat(qbAmount) || 0);
    if (!qbName || amount <= 0) {
      toast.error('Please enter a name and valid amount');
      return;
    }

    addBill({
      name: qbName,
      amount,
      category: qbCategory || 'Other',
      dueDate: qbDueDate,
      recurring: false,
      status: 'pending',
    });

    setShowAddBillQuick(false);
    setQbName('');
    setQbAmount('0');
    setQbCategory('');
    toast.success('Bill added');
  };

  const handleLogPaymentQuick = () => {
    const amount = Math.abs(parseFloat(lpAmount) || 0);

    if (lpType === 'loan') {
      if (!lpLoanId || amount <= 0) {
        toast.error('Select a loan and enter a valid amount');
        return;
      }
      logLoanPayment(lpLoanId, amount, lpNote || undefined);
      toast.success('Loan payment logged');
    }

    if (lpType === 'creditCard') {
      if (!lpCardId || amount <= 0) {
        toast.error('Select a card and enter a valid amount');
        return;
      }
      logCreditCardPayment(lpCardId, amount, lpNote || undefined);
      toast.success('Credit card payment logged');
    }

    if (lpType === 'bill') {
      if (!lpBillId) {
        toast.error('Select a bill');
        return;
      }
      markBillPaid(lpBillId, lpBillDate);
      toast.success('Bill payment logged');
    }

    setShowLogPayment(false);
    setLpAmount('0');
    setLpNote('');
  };

  const handleMarkDueItemPaid = (item: DueItem) => {
    const handled = settleDueItem(item, {
      markBillPaid,
      logLoanPayment,
      logCreditCardPayment,
      logPersonalDebtPayment,
    });
    if (!handled) return;

    if (item.sourceType === 'bill') {
      toast.success('Bill marked paid');
      return;
    }
    if (item.sourceType === 'credit-card') {
      toast.success('Credit card payment recorded');
      return;
    }
    if (item.sourceType === 'loan' || item.sourceType === 'installment') {
      toast.success('Loan payment recorded');
      return;
    }
    toast.success('Debt payment recorded');
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthTx = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });

  const income = monthTx.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = monthTx.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthNet = income - expenses;
  const previousBalance = totalBalance - monthNet;
  const balanceChangePct =
    previousBalance > 0 ? ((totalBalance - previousBalance) / previousBalance) * 100 : totalBalance > 0 ? 100 : 0;
  const isPositiveBalanceTrend = monthNet >= 0;
  const balanceTrendLabel =
    previousBalance <= 0 && totalBalance > 0 ? 'New balance this month' : previousBalance === 0 ? 'vs last month' : 'vs last month';

  const activeLoans = loans.filter((loan) => loan.paidAmount < getLoanTotalWithInterest(loan));
  const totalLoanRemaining = loans
    .filter((loan) => loan.type === 'loan')
    .reduce((sum, loan) => sum + Math.max(0, getLoanTotalWithInterest(loan) - loan.paidAmount), 0);
  const totalInstallmentRemaining = loans
    .filter((loan) => loan.type === 'installment')
    .reduce((sum, loan) => sum + Math.max(0, getLoanTotalWithInterest(loan) - loan.paidAmount), 0);
  const totalCreditCardDebt = creditCards.reduce((sum, card) => sum + Math.max(0, card.currentBalance), 0);
  const totalPersonalDebtOwed = personalDebts
    .filter((debt) => debt.status !== 'settled' && debt.direction === 'iOwe')
    .reduce((sum, debt) => sum + Math.max(0, debt.amount - debt.paidAmount), 0);
  const totalPersonalDebtReceivable = personalDebts
    .filter((debt) => debt.status !== 'settled' && debt.direction === 'owedToMe')
    .reduce((sum, debt) => sum + Math.max(0, debt.amount - debt.paidAmount), 0);
  const activeReceivablesCount = personalDebts.filter((debt) => debt.status !== 'settled' && debt.direction === 'owedToMe').length;
  const monthStart = new Date(thisYear, thisMonth, 1);
  const totalBillsDueThisMonth = bills
    .filter((bill) => bill.status !== 'paid' && isDateInMonth(bill.dueDate, monthStart))
    .reduce((sum, bill) => sum + Math.max(0, bill.amount), 0);
  const totalLoanAndInstallmentDueThisMonth = loans.reduce((sum, loan) => {
    const scheduleDue = getLoanRepaymentSchedule(loan)
      .filter((entry) => isDateInMonth(entry.dueDate, monthStart))
      .reduce((scheduleSum, entry) => scheduleSum + Math.max(0, entry.amount - entry.paidAmount), 0);
    return sum + scheduleDue;
  }, 0);
  const totalCreditCardDueThisMonth = creditCards
    .filter((card) => isDateInMonth(card.dueDate, monthStart))
    .reduce((sum, card) => {
      const paidThisCycle = Boolean(card.lastPaymentDate && card.lastPaymentDate >= card.dueDate);
      const dueAmount = card.minimumPayment > 0 ? card.minimumPayment : paidThisCycle ? 0 : card.currentBalance;
      return sum + Math.max(0, dueAmount);
    }, 0);
  const totalRecurringExpensesDueThisMonth = getRecurringExpenseDueThisMonth(recurringTransactionRules, monthStart);

  const hasFinancialData =
    accounts.length > 0 ||
    transactions.length > 0 ||
    loans.length > 0 ||
    personalDebts.length > 0 ||
    bills.length > 0 ||
    creditCards.length > 0 ||
    recurringTransactionRules.length > 0;

  const totalDueThisMonth =
    totalBillsDueThisMonth +
    totalLoanAndInstallmentDueThisMonth +
    totalCreditCardDueThisMonth +
    totalRecurringExpensesDueThisMonth;
  const totalDebts = totalLoanRemaining + totalInstallmentRemaining + totalCreditCardDebt + totalPersonalDebtOwed;
  const netAfterDebts = totalBalance + totalPersonalDebtReceivable - totalDebts;
  const nearNegativeNetThreshold = hasFinancialData ? Math.max(1000, totalDebts * 0.1) : 0;
  const isNetNegative = netAfterDebts < 0;
  const isNetNearNegative = hasFinancialData && !isNetNegative && netAfterDebts <= nearNegativeNetThreshold;
  const netCardClassName = isNetNegative
    ? 'border-destructive/60 bg-destructive/10'
    : isNetNearNegative
      ? 'border-warning/60 bg-warning/10'
      : undefined;
  const netValueClassName = isNetNegative ? 'text-destructive' : isNetNearNegative ? 'text-warning' : undefined;
  const netSubtitle = !hasFinancialData
    ? 'Add financial data to see net insights'
    : isNetNegative
      ? 'Alert: total debts exceed total balance'
      : isNetNearNegative
        ? 'Warning: net is close to negative'
        : 'Balance + money owed to you - debts';
  const totalLoansCount = loans.filter((loan) => loan.type === 'loan').length;
  const totalInstallmentsCount = loans.filter((loan) => loan.type === 'installment').length;

  const upcomingDueItems = useMemo(
    () =>
      getDueItems({
        bills,
        loans,
        creditCards,
        personalDebts,
        referenceDate: now,
      }),
    [bills, loans, creditCards, personalDebts, now]
  );

  const cashflowData = [
    { name: 'Income', amount: income },
    { name: 'Expenses', amount: expenses },
  ];

  const categoryMap: Record<string, number> = {};
  monthTx
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      getCategories(transaction).forEach((category) => {
        categoryMap[category] = (categoryMap[category] || 0) + transaction.amount;
      });
    });

  const categoryData = Object.entries(categoryMap).map(([name, value], index) => ({
    name,
    value,
    color: getCategoryColor(name, categoryColors, index),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={nickname ? `Welcome, ${nickname}` : 'Welcome'}
        description="Here is your money snapshot today. You are doing great keeping it on track."
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" aria-label="Open quick actions">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setShowAddExpense(true)}>Add expense</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowAddIncome(true)}>Add income</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowAddBillQuick(true)}>Add bill</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowLogPayment(true)}>Log payment</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
              <DialogContent>
                <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Account</Label>
                    <Select value={qeAccount} onValueChange={setQeAccount}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input type="number" value={qeAmount} onChange={(event) => setQeAmount(event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={qeCategory} onValueChange={setQeCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" value={qeDate} onChange={(event) => setQeDate(event.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleAddExpenseQuick}>Save expense</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddIncome} onOpenChange={setShowAddIncome}>
              <DialogContent>
                <DialogHeader><DialogTitle>Add income</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Account</Label>
                    <Select value={qiAccount} onValueChange={setQiAccount}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input type="number" value={qiAmount} onChange={(event) => setQiAmount(event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={qiCategory} onValueChange={setQiCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" value={qiDate} onChange={(event) => setQiDate(event.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleAddIncomeQuick}>Save income</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddBillQuick} onOpenChange={setShowAddBillQuick}>
              <DialogContent>
                <DialogHeader><DialogTitle>Add bill</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={qbName} onChange={(event) => setQbName(event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input type="number" value={qbAmount} onChange={(event) => setQbAmount(event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={qbCategory} onValueChange={setQbCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due date</Label>
                    <Input type="date" value={qbDueDate} onChange={(event) => setQbDueDate(event.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleAddBillQuick}>Save bill</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showLogPayment} onOpenChange={setShowLogPayment}>
              <DialogContent>
                <DialogHeader><DialogTitle>Log payment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={lpType} onValueChange={(value) => setLpType(value as typeof lpType)}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="creditCard">Credit Card</SelectItem>
                        <SelectItem value="bill">Bill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {lpType === 'loan' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label>Loan</Label>
                        <Select value={lpLoanId} onValueChange={setLpLoanId}>
                          <SelectTrigger><SelectValue placeholder="Select loan" /></SelectTrigger>
                          <SelectContent>
                            {loans.map((loan) => (
                              <SelectItem key={loan.id} value={loan.id}>{loan.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Amount</Label>
                        <Input type="number" value={lpAmount} onChange={(event) => setLpAmount(event.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Note</Label>
                        <Input value={lpNote} onChange={(event) => setLpNote(event.target.value)} />
                      </div>
                    </>
                  ) : null}

                  {lpType === 'creditCard' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label>Card</Label>
                        <Select value={lpCardId} onValueChange={setLpCardId}>
                          <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                          <SelectContent>
                            {creditCards.map((card) => (
                              <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Amount</Label>
                        <Input type="number" value={lpAmount} onChange={(event) => setLpAmount(event.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Note</Label>
                        <Input value={lpNote} onChange={(event) => setLpNote(event.target.value)} />
                      </div>
                    </>
                  ) : null}

                  {lpType === 'bill' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label>Bill</Label>
                        <Select value={lpBillId} onValueChange={setLpBillId}>
                          <SelectTrigger><SelectValue placeholder="Select bill" /></SelectTrigger>
                          <SelectContent>
                            {bills.map((bill) => (
                              <SelectItem key={bill.id} value={bill.id}>{bill.name} - {formatDueDate(bill.dueDate)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Paid date</Label>
                        <Input type="date" value={lpBillDate} onChange={(event) => setLpBillDate(event.target.value)} />
                      </div>
                    </>
                  ) : null}

                  <Button className="w-full" onClick={handleLogPaymentQuick}>Log payment</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Balance"
          value={`${currency}${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          trend={{
            value:
              previousBalance === 0 && totalBalance === 0
                ? 'No balance change yet'
                : `${Math.abs(balanceChangePct).toFixed(1)}% ${balanceTrendLabel}`,
            positive: isPositiveBalanceTrend,
          }}
          icon={<PhilippinePeso className="h-5 w-5" />}
        />
        <StatCard
          title="Total Owed To Me"
          value={`${currency}${totalPersonalDebtReceivable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`${activeReceivablesCount} active receivable${activeReceivablesCount === 1 ? '' : 's'}`}
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          title="Total Due This Month"
          value={`${currency}${totalDueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Current-month bills + loans + installments + credit cards + recurring expenses"
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          title="Net"
          value={`${currency}${netAfterDebts.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          valueClassName={netValueClassName}
          subtitle={netSubtitle}
          className={netCardClassName}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Loans"
          value={`${currency}${totalLoanRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`${totalLoansCount} loan${totalLoansCount === 1 ? '' : 's'}`}
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          title="Total Installments"
          value={`${currency}${totalInstallmentRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`${totalInstallmentsCount} installment${totalInstallmentsCount === 1 ? '' : 's'}`}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          title="Credit Cards"
          value={`${currency}${totalCreditCardDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`${creditCards.length} card${creditCards.length === 1 ? '' : 's'}`}
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          title="Total Debts"
          value={`${currency}${totalDebts.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Loans + installments + credit cards + personal debts"
          icon={<CreditCard className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <h3 className="mb-4 font-heading font-semibold text-foreground">Monthly Cashflow</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashflowData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(220, 10%, 46%)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(220, 10%, 46%)' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(220, 14%, 90%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${currency}${value.toLocaleString()}`, '']}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                <Cell fill="hsl(172, 66%, 40%)" />
                <Cell fill="hsl(0, 72%, 55%)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="mb-4 font-heading font-semibold text-foreground">Spending Breakdown</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${currency}${value}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.map((category) => (
                  <div key={category.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="text-muted-foreground">{category.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{currency}{category.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No expenses this month.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <h3 className="mb-4 font-heading font-semibold text-foreground">Upcoming Bills and Due Dates</h3>
          <div className="space-y-3">
            {upcomingDueItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming bills or due dates.</p>
            ) : (
              upcomingDueItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-sm p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleMarkDueItemPaid(item)}
                      aria-label={`Mark ${item.title} as paid`}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <Badge variant="outline">{DUE_ITEM_BADGE_LABELS[item.sourceType]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.detail} - Due: {formatDueDate(item.dueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{currency}{item.amount.toFixed(2)}</p>
                    <span className={cn('text-xs font-medium', item.status === 'overdue' ? 'text-destructive' : 'text-warning')}>
                      {item.status === 'overdue' ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="mb-4 font-heading font-semibold text-foreground">Loan Progress</h3>
          <div className="space-y-4">
            {activeLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active loans.</p>
            ) : (
              activeLoans.map((loan) => {
                const totalWithInterest = getLoanTotalWithInterest(loan);
                const pct = totalWithInterest > 0 ? Math.round((loan.paidAmount / totalWithInterest) * 100) : 0;

                return (
                  <div key={loan.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{loan.name}</p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {currency}{loan.paidAmount.toLocaleString()} / {currency}{totalWithInterest.toLocaleString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
