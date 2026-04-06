import { useFinanceStore } from '@/store/financeStore';
import { StatCard } from '@/components/StatCard';
import { PhilippinePeso, Receipt, TrendingUp, CreditCard, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const CHART_COLORS = [
  'hsl(172, 66%, 40%)',
  'hsl(220, 70%, 55%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 72%, 55%)',
  'hsl(150, 50%, 45%)',
];

const formatDueDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export default function Dashboard() {
  const { accounts, transactions, loans, bills, currency } = useFinanceStore();

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

  const activeLoans = loans.filter((l) => l.paidAmount < l.totalAmount);
  const totalLoanRemaining = activeLoans.reduce((s, l) => s + (l.totalAmount - l.paidAmount), 0);
  const installments = activeLoans.filter((l) => l.type === 'installment');

  const totalBillsDue = bills.filter((b) => b.status !== 'paid').reduce((s, b) => s + b.amount, 0);
  const paidBills = bills.filter((b) => b.status === 'paid').length;

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
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your financial overview at a glance</p>
      </div>

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
          title="Active Loans"
          value={String(activeLoans.length)}
          subtitle={`${currency}${totalLoanRemaining.toLocaleString()} remaining`}
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          title="Installments"
          value={String(installments.length)}
          subtitle={`${currency}${installments.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0).toLocaleString()} remaining`}
          icon={<CalendarClock className="h-5 w-5" />}
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
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${currency}${value}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
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
                const pct = Math.round((l.paidAmount / l.totalAmount) * 100);
                return (
                  <div key={l.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {currency}{l.paidAmount.toLocaleString()} / {currency}{l.totalAmount.toLocaleString()}
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
