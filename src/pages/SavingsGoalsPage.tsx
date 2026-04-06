import { useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '@/store/financeStore';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Sparkles, Gift, Pencil, Trash2, PhilippinePeso, CalendarDays, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavingsGoalCategory } from '@/types/finance';

const GOAL_CATEGORIES: SavingsGoalCategory[] = ['Vacation', 'Emergency Fund', 'Home', 'Education', 'Tech', 'Other'];

const formatMoney = (currency: string, amount: number) =>
  `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value?: string) => {
  if (!value) return 'No date set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export default function SavingsGoalsPage() {
  const {
    savingsGoals,
    savingsGoalContributions,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addSavingsContribution,
    currency,
  } = useFinanceStore();

  const [showAdd, setShowAdd] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('0');
  const [contributionNote, setContributionNote] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<SavingsGoalCategory>('Vacation');
  const [targetAmount, setTargetAmount] = useState('0');
  const [savedAmount, setSavedAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [note, setNote] = useState('');

  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<SavingsGoalCategory>('Vacation');
  const [editTargetAmount, setEditTargetAmount] = useState('0');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editNote, setEditNote] = useState('');

  const totalTarget = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = savingsGoals.reduce((sum, goal) => sum + goal.savedAmount, 0);
  const completedGoals = savingsGoals.filter((goal) => goal.completedAt);
  const activeGoals = savingsGoals.filter((goal) => !goal.completedAt);
  const progress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const openEdit = (goalId: string) => {
    const goal = savingsGoals.find((item) => item.id === goalId);
    if (!goal) return;

    setEditGoalId(goalId);
    setEditName(goal.name);
    setEditCategory(goal.category);
    setEditTargetAmount(String(goal.targetAmount));
    setEditTargetDate(goal.targetDate ?? '');
    setEditNote(goal.note ?? '');
  };

  const handleAddGoal = () => {
    if (!name || !targetAmount) return;

    addSavingsGoal({
      name,
      category,
      targetAmount: parseFloat(targetAmount) || 0,
      savedAmount: Math.max(0, parseFloat(savedAmount) || 0),
      targetDate,
      note: note || undefined,
    });

    setName('');
    setCategory('Vacation');
    setTargetAmount('0');
    setSavedAmount('0');
    setTargetDate('');
    setNote('');
    setShowAdd(false);
  };

  const handleEditGoal = () => {
    if (!editGoalId || !editName || !editTargetAmount) return;

    updateSavingsGoal(editGoalId, {
      name: editName,
      category: editCategory,
      targetAmount: parseFloat(editTargetAmount) || 0,
      targetDate: editTargetDate,
      note: editNote || undefined,
    });
    setEditGoalId(null);
  };

  const handleContribution = () => {
    if (!contributeGoalId || !contributionAmount) return;
    const goal = savingsGoals.find((item) => item.id === contributeGoalId);
    if (!goal) return;

    const amount = Math.max(0, parseFloat(contributionAmount) || 0);
    const wasComplete = goal.savedAmount >= goal.targetAmount;

    addSavingsContribution(contributeGoalId, amount, contributionNote || undefined);

    if (!wasComplete && goal.savedAmount + amount >= goal.targetAmount) {
      toast.success(`Goal completed: ${goal.name}`, {
        description: `You reached ${formatMoney(currency, goal.targetAmount)} and unlocked the celebration.`,
      });
    } else {
      toast('Contribution added', {
        description: `Added ${formatMoney(currency, amount)} to ${goal.name}.`,
      });
    }

    setContributionAmount('0');
    setContributionNote('');
    setContributeGoalId(null);
  };

  const renderGoal = (goal: (typeof savingsGoals)[0]) => {
    const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    const isComplete = !!goal.completedAt;

    return (
      <div key={goal.id} className={cn('glass-card rounded-xl p-5', isComplete && 'border-success/40 bg-success/5')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-base font-semibold text-foreground">{goal.name}</p>
              <Badge variant={isComplete ? 'default' : 'secondary'} className="text-[10px] uppercase tracking-wide">
                {goal.category}
              </Badge>
              {isComplete && (
                <Badge variant="outline" className="border-success/40 text-success">
                  Completed
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Target date: {formatDate(goal.targetDate)} {goal.note ? `• ${goal.note}` : ''}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setContributeGoalId(goal.id)}>
              <PhilippinePeso className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(goal.id)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deleteSavingsGoal(goal.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatMoney(currency, goal.savedAmount)} saved</span>
            <span>{formatMoney(currency, remaining)} left</span>
          </div>
        </div>

        {isComplete && (
          <div className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3">
            <div className="flex items-center gap-2 text-success">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-medium">Goal achieved</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Completed on {formatDate(goal.completedAt)}. Time to celebrate.
            </p>
          </div>
        )}
      </div>
    );
  };

  const recentContributions = savingsGoalContributions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Savings Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">Set targets, track progress, and celebrate every win</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Savings Goal</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Goal name</Label>
                <Input placeholder="e.g. Vacation to Japan" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as SavingsGoalCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target amount</Label>
                <Input type="number" placeholder="0.00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Start saved amount</Label>
                <Input type="number" placeholder="0.00" value={savedAmount} onChange={(e) => setSavedAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Target date</Label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button className="md:col-span-2" onClick={handleAddGoal}>Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Saved"
          value={formatMoney(currency, totalSaved)}
          subtitle={`${savingsGoals.length} goal${savingsGoals.length === 1 ? '' : 's'}`}
          icon={<PhilippinePeso className="h-5 w-5" />}
        />
        <StatCard
          title="Total Target"
          value={formatMoney(currency, totalTarget)}
          subtitle={`${progress}% overall progress`}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Active Goals"
          value={String(activeGoals.length)}
          subtitle="Currently in progress"
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatCard
          title="Completed"
          value={String(completedGoals.length)}
          subtitle="Goals reached and celebrated"
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Overall Progress</h2>
            <p className="text-sm text-muted-foreground mt-1">Across all savings goals</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Gift className="h-3.5 w-3.5" />
            Keep going
          </Badge>
        </div>
        <div className="mt-4 space-y-2">
          <Progress value={progress} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatMoney(currency, totalSaved)} saved</span>
            <span>{formatMoney(currency, totalTarget)} target</span>
          </div>
        </div>
      </div>

      <Dialog open={!!contributeGoalId} onOpenChange={() => setContributeGoalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input placeholder="Optional note" value={contributionNote} onChange={(e) => setContributionNote(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleContribution}>Add Money</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editGoalId} onOpenChange={() => setEditGoalId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Goal name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={(v) => setEditCategory(v as SavingsGoalCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target amount</Label>
              <Input type="number" value={editTargetAmount} onChange={(e) => setEditTargetAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Target date</Label>
              <Input type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Note</Label>
              <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </div>
            <Button className="md:col-span-2" onClick={handleEditGoal}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">Active Goals</h2>
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              {activeGoals.map(renderGoal)}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <p className="text-muted-foreground">No active savings goals yet. Create one to get started.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">Celebrations</h2>
          {completedGoals.length > 0 ? (
            <div className="space-y-4">
              {completedGoals.map(renderGoal)}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <p className="text-muted-foreground">Completed goals will show up here with a celebration.</p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Recent Contributions</h2>
            <p className="text-sm text-muted-foreground mt-1">Latest additions to your goals</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Live history
          </Badge>
        </div>
        <div className="mt-4 space-y-3">
          {recentContributions.length > 0 ? (
            recentContributions.map((contribution) => {
              const goal = savingsGoals.find((item) => item.id === contribution.goalId);
              return (
                <div key={contribution.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{goal?.name ?? 'Savings Goal'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(contribution.date)}{contribution.note ? ` • ${contribution.note}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-success">{formatMoney(currency, contribution.amount)}</p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No contributions logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
