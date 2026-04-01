import { useFinanceStore } from '@/store/financeStore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

const COLORS = [
  'hsl(172, 66%, 40%)',
  'hsl(220, 70%, 55%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 72%, 55%)',
  'hsl(150, 50%, 45%)',
  'hsl(340, 65%, 55%)',
  'hsl(60, 70%, 45%)',
];

export default function AnalyticsPage() {
  const { transactions, currency } = useFinanceStore();

  const thisYear = new Date().getFullYear();

  // Monthly trend data
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === i && d.getFullYear() === thisYear;
    });
    return {
      name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expenses: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  // Category breakdown (all time expenses)
  const categoryMap: Record<string, number> = {};
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalExpenses = categoryData.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Analytics & Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">Understand your spending patterns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending Breakdown */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Spending by Category</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${currency}${value}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-foreground">{currency}{c.value}</span>
                      <span className="text-xs text-muted-foreground ml-1">({Math.round((c.value / totalExpenses) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No expense data yet.</p>
          )}
        </div>

        {/* Income vs Expenses Bar */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={months.filter((m) => m.income > 0 || m.expenses > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 14%, 90%)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => [`${currency}${value.toLocaleString()}`, '']}
              />
              <Bar dataKey="income" fill="hsl(172, 66%, 40%)" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Trend Line */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-4">Monthly Trends ({thisYear})</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={months}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
            <Tooltip
              contentStyle={{ background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(220, 14%, 90%)', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: number) => [`${currency}${value.toLocaleString()}`, '']}
            />
            <Line type="monotone" dataKey="income" stroke="hsl(172, 66%, 40%)" strokeWidth={2} dot={{ r: 3 }} name="Income" />
            <Line type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
