import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, TriangleAlert, CheckCircle2, Target, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useFinanceStore } from '@/store/financeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { buildTransactionCategoryOptions } from '@/lib/transactionCategories';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { MonthlyBudget } from '@/types/finance';
import { PhilippinePeso } from 'lucide-react';

const normalizeCategory = (value: string) => value.trim().toLowerCase();
const asDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type BudgetStatus = 'healthy' | 'warning' | 'over' | 'inactive';

type BudgetSummary = MonthlyBudget & {
  spent: number;
  remaining: number;
  percent: number;
  status: BudgetStatus;
};

const statusRank: Record<BudgetStatus, number> = {
  over: 0,
  warning: 1,
  healthy: 2,
  inactive: 3,
};

export default function BudgetPage() {
  const {
    transactions,
    transactionCategories,
    sharedCategories,
    budgets,
    addBudget,
    updateBudget,
    deleteBudget,
    currency,
  } = useFinanceStore();

  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('0');
  const [budgetThreshold, setBudgetThreshold] = useState('80');
  const [budgetActive, setBudgetActive] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

  const now = new Date();
  const currentMonthKey = format(now, 'yyyy-MM');
  const currentMonthLabel = format(now, 'MMMM yyyy');
  const categorySuggestions = useMemo(() => {
    const base = buildTransactionCategoryOptions(transactions, transactionCategories, sharedCategories);
    const extras = ['Housing', 'Subscriptions', 'Education', 'Travel'];
    return Array.from(new Set([...base, ...extras]));
  }, [transactions]);

  const openAddBudget = () => {
    setEditingBudgetId(null);
    setBudgetCategory('');
    setBudgetAmount('0');
    setBudgetThreshold('80');
    setBudgetActive(true);
    setShowBudgetDialog(true);
  };

  const openEditBudget = (budget: MonthlyBudget) => {
    setEditingBudgetId(budget.id);
    setBudgetCategory(budget.category);
    setBudgetAmount(String(budget.limitAmount));
    setBudgetThreshold(String(budget.alertThresholdPct));
    setBudgetActive(budget.active);
    setShowBudgetDialog(true);
  };

  const closeBudgetDialog = () => {
    setShowBudgetDialog(false);
    setEditingBudgetId(null);
  };

  const currentMonthExpenses = useMemo(() => {
    const map = new Map<string, number>();

    transactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return;
      const date = asDate(transaction.date);
      if (!date || format(date, 'yyyy-MM') !== currentMonthKey) return;
      (transaction.categories?.length ? transaction.categories : [transaction.category]).forEach((category) => {
        const key = normalizeCategory(category);
        map.set(key, (map.get(key) ?? 0) + transaction.amount);
      });
    });

    return map;
  }, [currentMonthKey, transactions]);

  const budgetSummaries = useMemo<BudgetSummary[]>(() => {
    return budgets
      .map((budget) => {
        const spent = currentMonthExpenses.get(normalizeCategory(budget.category)) ?? 0;
        const remaining = budget.limitAmount - spent;
        const percent = budget.limitAmount > 0 ? (spent / budget.limitAmount) * 100 : 0;
        const status: BudgetStatus = !budget.active
          ? 'inactive'
          : spent >= budget.limitAmount
            ? 'over'
            : percent >= budget.alertThresholdPct
              ? 'warning'
              : 'healthy';

        return {
          ...budget,
          spent,
          remaining,
          percent,
          status,
        };
      })
      .sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.category.localeCompare(b.category));
  }, [budgets, currentMonthExpenses]);

  const totals = useMemo(() => {
    const activeBudgets = budgetSummaries.filter((budget) => budget.active);
    return {
      budgeted: activeBudgets.reduce((sum, budget) => sum + budget.limitAmount, 0),
      spent: activeBudgets.reduce((sum, budget) => sum + budget.spent, 0),
      remaining: activeBudgets.reduce((sum, budget) => sum + Math.max(0, budget.remaining), 0),
      alerts: budgetSummaries.filter((budget) => budget.status === 'warning' || budget.status === 'over').length,
    };
  }, [budgetSummaries]);

  const alertBudgets = budgetSummaries.filter((budget) => budget.status === 'warning' || budget.status === 'over');

  const handleSaveBudget = () => {
    if (!budgetCategory.trim()) {
      toast.error('Enter a budget category.');
      return;
    }

    const limitAmount = Math.max(0, Number(budgetAmount));
    if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
      toast.error('Enter a valid monthly budget amount.');
      return;
    }

    const alertThresholdPct = Math.min(100, Math.max(1, Math.floor(Number(budgetThreshold) || 80)));

    const payload = {
      category: budgetCategory.trim(),
      limitAmount,
      alertThresholdPct,
      active: budgetActive,
    };

    if (editingBudgetId) {
      updateBudget(editingBudgetId, payload);
      toast.success('Budget updated.');
    } else {
      addBudget(payload);
      toast.success('Budget added.');
    }

    closeBudgetDialog();
  };

  const handleDeleteBudget = (budgetId: string) => {
    const budget = budgets.find((item) => item.id === budgetId);
    if (!budget) return;
    setPendingDelete({ id: budgetId, label: budget.category });
  };

  const confirmDeleteBudget = () => {
    if (!pendingDelete) return;
    deleteBudget(pendingDelete.id);
    toast.success('Budget deleted.');
    setPendingDelete(null);
  };

  const formatMoney = (value: number) =>
    `${currency}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description={`Monthly budgets and alerts for ${currentMonthLabel}.`}
        actions={
          <Dialog
            open={showBudgetDialog}
            onOpenChange={(open) => {
              setShowBudgetDialog(open);
              if (!open) {
                setEditingBudgetId(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openAddBudget}>
                <Plus className="mr-1 h-4 w-4" />
                Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBudgetId ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input
                    list="budget-category-suggestions"
                    placeholder="e.g. Food"
                    value={budgetCategory}
                    onChange={(event) => setBudgetCategory(event.target.value)}
                  />
                  <datalist id="budget-category-suggestions">
                    {categorySuggestions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <Label>Monthly budget amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetAmount}
                    onChange={(event) => setBudgetAmount(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Alert threshold (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={budgetThreshold}
                    onChange={(event) => setBudgetThreshold(event.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active</p>
                    <p className="text-xs text-muted-foreground">Receive alerts for this budget</p>
                  </div>
                  <Switch checked={budgetActive} onCheckedChange={setBudgetActive} />
                </div>

                <Button className="w-full" onClick={handleSaveBudget}>
                  {editingBudgetId ? 'Save changes' : 'Add budget'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Budget"
          value={formatMoney(totals.budgeted)}
          subtitle={`${budgetSummaries.filter((budget) => budget.active).length} active budgets`}
          icon={<PhilippinePeso className="h-5 w-5" />}
        />
        <StatCard
          title="Spent This Month"
          value={formatMoney(totals.spent)}
          subtitle={currentMonthLabel}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          title="Remaining"
          value={formatMoney(totals.remaining)}
          subtitle="Across all active budgets"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          title="Alerts"
          value={String(totals.alerts)}
          subtitle="Near or over limit"
          icon={<TriangleAlert className="h-5 w-5" />}
        />
      </div>

      {alertBudgets.length > 0 && (
        <div className="space-y-3">
          {alertBudgets.map((budget) => (
            <Alert
              key={budget.id}
              variant="default"
              className={
                budget.status === 'over'
                  ? 'border-destructive/40 bg-destructive/10 text-foreground dark:bg-destructive/20'
                  : 'border-warning/40 bg-warning/10 text-foreground dark:bg-warning/20'
              }
            >
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>
                {budget.status === 'over' ? 'Budget exceeded' : 'Budget near limit'} — {budget.category}
              </AlertTitle>
              <AlertDescription>
                {budget.status === 'over'
                  ? `${formatMoney(Math.max(0, budget.spent - budget.limitAmount))} over the monthly limit.`
                  : `${formatMoney(budget.spent)} spent of ${formatMoney(budget.limitAmount)} (${Math.round(budget.percent)}%).`}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete budget?"
        description={
          pendingDelete
            ? `Are you sure you want to delete the budget for "${pendingDelete.label}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDeleteBudget}
      />

      <Card>
        <CardHeader>
          <CardTitle>Monthly budgets</CardTitle>
          <CardDescription>
            Budgets are tracked against expenses in the current month and reset automatically next month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgetSummaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
              <Target className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">No budgets yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a monthly budget to start tracking spending and get alerts before you overspend.
              </p>
              <Button className="mt-4" onClick={openAddBudget}>
                <Plus className="mr-1 h-4 w-4" />
                Add your first budget
              </Button>
            </div>
          ) : (
            budgetSummaries.map((budget) => {
              const progressValue = Math.min(100, Math.max(0, budget.percent));
              const remaining = budget.limitAmount - budget.spent;
              const isOver = budget.status === 'over';
              const isWarning = budget.status === 'warning';

              return (
                <div key={budget.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-lg font-semibold text-foreground">{budget.category}</h3>
                        <Badge variant={budget.active ? 'default' : 'secondary'}>
                          {budget.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge
                          variant={isOver ? 'destructive' : 'outline'}
                          className={isWarning ? 'border-warning/50 bg-warning/10 text-foreground dark:text-foreground' : ''}
                        >
                          {isOver ? 'Over limit' : isWarning ? 'Near limit' : 'On track'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(budget.spent)} spent of {formatMoney(budget.limitAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Alert at {budget.alertThresholdPct}% · {remaining >= 0 ? `${formatMoney(remaining)} remaining` : `${formatMoney(Math.abs(remaining))} overspent`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEditBudget(budget)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleDeleteBudget(budget.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Progress value={progressValue} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.round(budget.percent)}% used</span>
                      <span>Updated {currentMonthLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
