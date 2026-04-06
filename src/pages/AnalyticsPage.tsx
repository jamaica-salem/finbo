import { useMemo, useState } from 'react';
import {
  BarChart3,
  Clock3,
  Filter,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Sparkles,
  Store,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinanceStore } from '@/store/financeStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { getCategoryColor } from '@/lib/transactionCategories';
import { PhilippinePeso } from 'lucide-react';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PERIOD_OPTIONS = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
] as const;

type PeriodValue = (typeof PERIOD_OPTIONS)[number]['value'];

const formatMoney = (currency: string, value: number) =>
  `${currency}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const startDateForPeriod = (period: PeriodValue) => {
  const now = new Date();
  const d = new Date(now);
  if (period === '30d') d.setDate(now.getDate() - 30);
  if (period === '90d') d.setDate(now.getDate() - 90);
  if (period === '6m') d.setMonth(now.getMonth() - 6);
  if (period === '12m') d.setMonth(now.getMonth() - 12);
  d.setHours(0, 0, 0, 0);
  return d;
};

const asDate = (value: string) => new Date(`${value}T00:00:00`);

const getMerchantLabel = (description: string) => description.trim() || 'Unspecified';
const getCategories = (transaction: { category: string; categories?: string[] }) =>
  (transaction.categories && transaction.categories.length > 0 ? transaction.categories : [transaction.category]).filter(Boolean);

export default function AnalyticsPage() {
  const { transactions, currency, categoryColors } = useFinanceStore();
  const [period, setPeriod] = useState<PeriodValue>('6m');

  const now = new Date();
  const periodStart = useMemo(() => startDateForPeriod(period), [period]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const date = asDate(transaction.date);
        return date >= periodStart && date <= now;
      }),
    [now, periodStart, transactions],
  );

  const expenses = filteredTransactions.filter((transaction) => transaction.type === 'expense');
  const incomes = filteredTransactions.filter((transaction) => transaction.type === 'income');

  const totalExpenses = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalIncome = incomes.reduce((sum, transaction) => sum + transaction.amount, 0);
  const netCashflow = totalIncome - totalExpenses;

  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const monthTransactions = transactions.filter((transaction) => {
        const date = asDate(transaction.date);
        return date.getMonth() === index && date.getFullYear() === now.getFullYear();
      });

      return {
        name: MONTH_LABELS[index],
        income: monthTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expenses: monthTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      };
    });
  }, [now.getFullYear(), transactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((transaction) => {
      getCategories(transaction).forEach((category) => {
        map[category] = (map[category] || 0) + transaction.amount;
      });
    });
    return Object.entries(map)
      .map(([name, value], index) => ({ name, value, color: getCategoryColor(name, categoryColors, index) }))
      .sort((a, b) => b.value - a.value);
  }, [categoryColors, expenses]);

  const merchantData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((transaction) => {
      const merchant = getMerchantLabel(transaction.description);
      map[merchant] = (map[merchant] || 0) + transaction.amount;
    });
    return Object.entries(map)
      .map(([name, value], index) => ({ name, value, color: getCategoryColor(name, categoryColors, index) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [categoryColors, expenses]);

  const weeklyBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((transaction) => {
      const day = asDate(transaction.date).toLocaleDateString('en-US', { weekday: 'short' });
      map[day] = (map[day] || 0) + transaction.amount;
    });
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return order
      .map((day) => ({ name: day, value: map[day] || 0 }))
      .filter((entry) => entry.value > 0);
  }, [expenses]);

  const monthBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expenses: number }> = {};
    transactions.forEach((transaction) => {
      const monthKey = `${asDate(transaction.date).getFullYear()}-${String(asDate(transaction.date).getMonth() + 1).padStart(2, '0')}`;
      if (!map[monthKey]) map[monthKey] = { income: 0, expenses: 0 };
      map[monthKey][transaction.type === 'income' ? 'income' : 'expenses'] += transaction.amount;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([monthKey, values]) => ({
        name: new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(`${monthKey}-01T00:00:00`)),
        ...values,
      }));
  }, [transactions]);

  const recurringMerchants = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.forEach((transaction) => {
      const merchant = getMerchantLabel(transaction.description);
      counts[merchant] = (counts[merchant] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [expenses]);

  const topCategory = categoryData[0];
  const topMerchant = merchantData[0];
  const averageDailySpend = expenses.length > 0
    ? totalExpenses / Math.max(1, Math.ceil((Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const hasData = filteredTransactions.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Insights"
        description="Personalized spending analysis by category, merchant, and time period."
        actions={
          <div className="w-full max-w-xs">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Time period
          </div>
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodValue)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Spending"
          value={formatMoney(currency, totalExpenses)}
          subtitle={`${filteredTransactions.length} transactions in range`}
          icon={<PhilippinePeso className="h-5 w-5" />}
        />
        <StatCard
          title="Income"
          value={formatMoney(currency, totalIncome)}
          subtitle={`Net cashflow ${netCashflow >= 0 ? 'positive' : 'negative'}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Average Daily Spend"
          value={formatMoney(currency, averageDailySpend)}
          subtitle={`Over the selected period`}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <StatCard
          title="Top Merchant"
          value={topMerchant ? topMerchant.name : 'N/A'}
          subtitle={topMerchant ? formatMoney(currency, topMerchant.value) : 'No merchant data yet'}
          icon={<Store className="h-5 w-5" />}
        />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground">No transactions in the selected period yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Spending by Category
                </CardTitle>
                <CardDescription>See where most of your money goes.</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {categoryData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatMoney(currency, value), '']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                    {categoryData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-foreground">{formatMoney(currency, entry.value)}</span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({Math.round((entry.value / totalExpenses) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No expense data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Spending by Merchant
                </CardTitle>
                <CardDescription>Use descriptions as merchant/payee labels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {merchantData.length > 0 ? (
                  <div className="space-y-3">
                    {merchantData.map((merchant, index) => (
                      <div key={merchant.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{merchant.name}</span>
                          <span className="text-muted-foreground">{formatMoney(currency, merchant.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.max(6, Math.round((merchant.value / totalExpenses) * 100))}%`,
                              backgroundColor: getCategoryColor(merchant.name, categoryColors, index),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No merchant data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-primary" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>Track income and spending through the year.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 14%, 90%)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [formatMoney(currency, value), '']}
                    />
                    <Line type="monotone" dataKey="income" stroke="hsl(172, 66%, 40%)" strokeWidth={2} dot={{ r: 3 }} name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Time Period Breakdown
                </CardTitle>
                <CardDescription>See how spending changes by month and day of week.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 14%, 90%)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [formatMoney(currency, value), '']}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 55%)" fill="hsl(0, 72%, 55%)" fillOpacity={0.15} name="Expenses" />
                    <Area type="monotone" dataKey="income" stroke="hsl(172, 66%, 40%)" fill="hsl(172, 66%, 40%)" fillOpacity={0.12} name="Income" />
                  </AreaChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Weekly spending pattern</p>
                  <div className="space-y-2">
                    {weeklyBreakdown.length > 0 ? (
                      weeklyBreakdown.map((day) => (
                        <div key={day.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{day.name}</span>
                            <span className="font-medium text-foreground">{formatMoney(currency, day.value)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-destructive/80"
                              style={{ width: `${Math.max(6, Math.round((day.value / totalExpenses) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No weekly pattern yet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Personalized Insights
              </CardTitle>
              <CardDescription>Quick patterns the app can surface from your spending.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top category</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {topCategory ? `${topCategory.name} with ${formatMoney(currency, topCategory.value)}` : 'No category data yet'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recurring merchant</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {recurringMerchants.length > 0
                    ? `${recurringMerchants[0].name} appears ${recurringMerchants[0].count} times`
                    : 'No repeating merchant pattern yet'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Budget watch</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {netCashflow >= 0
                    ? `You are spending ${formatMoney(currency, totalExpenses)} against ${formatMoney(currency, totalIncome)} income in this period.`
                    : `Spending is outpacing income by ${formatMoney(currency, Math.abs(netCashflow))}.`}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
