import { useFinanceStore } from '@/store/financeStore';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { PhilippinePeso, Receipt, TrendingUp, CreditCard, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { getCategoryColor } from '@/lib/transactionCategories';
import { getLoanTotalWithInterest } from '@/lib/interest';

const formatDueDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};
const getCategories = (transaction: { category: string; categories?: string[] }) =>
  (transaction.categories && transaction.categories.length > 0 ? transaction.categories : [transaction.category]).filter(Boolean);

export default function Dashboard() {
  const { accounts, transactions, loans, bills, creditCards, recurringTransactionRules, currency, categoryColors } = useFinanceStore();

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthNet = income - expenses;
  const previousBalance = totalBalance - monthNet;
  const balanceChangePct =
    previousBalance > 0 ? ((totalBalance - previousBalance) / previousBalance) * 100 : totalBalance > 0 ? 100 : 0;
  const isPositiveBalanceTrend = monthNet >= 0;
  const balanceTrendLabel =
    previousBalance <= 0 && totalBalance > 0
      ? 'New balance this month'
      : previousBalance === 0
        ? 'vs last month'
        : `vs last month`;

  const activeLoans = loans.filter((l) => l.paidAmount < getLoanTotalWithInterest(l));
  const totalBillsDue = bills.filter((b) => b.status !== 'paid').reduce((s, b) => s + b.amount, 0);
  const paidBills = bills.filter((b) => b.status === 'paid').length;
  const totalLoanRemaining = loans.filter((l) => l.type === 'loan').reduce((s, l) => s + Math.max(0, getLoanTotalWithInterest(l) - l.paidAmount), 0);
  const totalInstallmentRemaining = loans.filter((l) => l.type === 'installment').reduce((s, l) => s + Math.max(0, getLoanTotalWithInterest(l) - l.paidAmount), 0);
  const totalLoanMonthlyPayments = loans.filter((l) => l.type === 'loan').reduce((s, l) => s + Math.max(0, l.monthlyPayment), 0);
  const totalInstallmentMonthlyPayments = loans.filter((l) => l.type === 'installment').reduce((s, l) => s + Math.max(0, l.monthlyPayment), 0);
  const totalCreditCardDebt = creditCards.reduce((s, card) => s + Math.max(0, card.currentBalance), 0);
  const totalCreditCardMinimumPayments = creditCards.reduce((s, card) => s + Math.max(0, card.minimumPayment), 0);
  const activeMonthlyRecurringExpenses = recurringTransactionRules
    .filter((rule) => rule.active && rule.type === 'expense' && rule.frequency === 'monthly')
    .reduce((s, rule) => s + Math.max(0, rule.amount), 0);

  const totalMonthlyPayments = totalBillsDue + totalLoanMonthlyPayments + totalInstallmentMonthlyPayments + totalCreditCardMinimumPayments + activeMonthlyRecurringExpenses;
  const totalDebts = totalLoanRemaining + totalInstallmentRemaining + totalCreditCardDebt;
  const netAfterDebts = totalBalance - totalDebts;
  const totalLoansCount = loans.filter((l) => l.type === 'loan').length;
  const totalInstallmentsCount = loans.filter((l) => l.type === 'installment').length;

  const getDueTime = (value: string) => {
    const time = new Date(`${value}T00:00:00`).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  };
  const upcomingBills = bills
    .filter((b) => b.status !== 'paid')
    .sort((a, b) => getDueTime(a.dueDate) - getDueTime(b.dueDate));

  // Cashflow chart data
  const cashflowData = [
    { name: 'Income', amount: income },
    { name: 'Expenses', amount: expenses },
  ];

  // Spending by category
  const categoryMap: Record<string, number> = {};
  monthTx.filter((t) => t.type === 'expense').forEach((t) => {
    getCategories(t).forEach((category) => {
      categoryMap[category] = (categoryMap[category] || 0) + t.amount;
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
        title="Dashboard"
        description="Your financial overview at a glance"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          title="Monthly Bills"
          value={`${currency}${totalBillsDue.toFixed(2)}`}
          subtitle={`${paidBills}/${bills.length} paid`}
          icon={<Receipt className="h-5 w-5" />}
        />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Payments"
          value={`${currency}${totalMonthlyPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Bills + loans + installments + credit cards + recurring expenses"
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          title="Total Debts"
          value={`${currency}${totalDebts.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Loans + installments + credit cards"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          title="Net"
          value={`${currency}${netAfterDebts.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Total balance - total debts"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Credit Cards"
          value={`${currency}${totalCreditCardDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`${creditCards.length} card${creditCards.length === 1 ? '' : 's'}`}
          icon={<CreditCard className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cashflow */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Monthly Cashflow</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashflowData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(220, 10%, 46%)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(220, 10%, 46%)' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 14%, 90%)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => [`${currency}${value.toLocaleString()}`, '']}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                <Cell fill="hsl(172, 66%, 40%)" />
                <Cell fill="hsl(0, 72%, 55%)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending Breakdown */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Spending Breakdown</h3>
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
                {categoryData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-muted-foreground">{c.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{currency}{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No expenses this month.</p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Bills */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Upcoming Bills</h3>
          <div className="space-y-3">
            {upcomingBills.length === 0 ? (
              <p className="text-sm text-muted-foreground">All bills paid! 🎉</p>
            ) : (
              upcomingBills.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">Due: {formatDueDate(b.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{currency}{b.amount.toFixed(2)}</p>
                    <span className={cn(
                      'text-xs font-medium',
                      b.status === 'overdue' || getDueTime(b.dueDate) < now.getTime() ? 'text-destructive' : 'text-warning'
                    )}>
                      {b.status === 'overdue' || getDueTime(b.dueDate) < now.getTime() ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Loans */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Loan Progress</h3>
          <div className="space-y-4">
            {activeLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active loans.</p>
            ) : (
              activeLoans.map((l) => {
                const totalWithInterest = getLoanTotalWithInterest(l);
                const pct = totalWithInterest > 0 ? Math.round((l.paidAmount / totalWithInterest) * 100) : 0;
                return (
                  <div key={l.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {currency}{l.paidAmount.toLocaleString()} / {currency}{totalWithInterest.toLocaleString()}
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
