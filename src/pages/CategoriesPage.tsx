import { useMemo, useState, type ElementType } from 'react';
import { Palette, Pencil, Plus, ShieldCheck, Sparkles, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useFinanceStore } from '@/store/financeStore';
import { buildTransactionCategoryOptions, getCategoryColor } from '@/lib/transactionCategories';
import type { CategoryRuleMatchType, SavingsGoal } from '@/types/finance';

const DEFAULT_SAVINGS_CATEGORIES = ['Vacation', 'Emergency Fund', 'Home', 'Education', 'Tech', 'Other'];
const MATCH_TYPE_OPTIONS: Array<{ value: CategoryRuleMatchType; label: string }> = [
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'equals', label: 'Equals' },
];

const normalizeName = (value: string) => value.trim();

function CategoryListCard({
  title,
  description,
  icon: Icon,
  items,
  emptyText,
  inputValue,
  onInputChange,
  onAdd,
  inputPlaceholder,
  helper,
  onColorChange,
  onRename,
  onDelete,
}: {
  title: string;
  description: string;
  icon: ElementType;
  items: Array<{ name: string; count: number; color: string; note?: string }>;
  emptyText: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  inputPlaceholder: string;
  helper?: string;
  onColorChange: (name: string, color: string) => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label>Add a category</Label>
            <Input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={inputPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAdd();
              }}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full sm:w-auto" onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.name} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="text-sm font-medium text-foreground">{item.name}</div>
                    <Badge variant="secondary">{item.count} {item.count === 1 ? 'item' : 'items'}</Badge>
                    {item.note ? <Badge variant="outline">{item.note}</Badge> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={item.color}
                    onChange={(e) => onColorChange(item.name, e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                    aria-label={`Set color for ${item.name}`}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRename(item.name)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CategoriesPage() {
  const {
    transactions,
    bills,
    savingsGoals,
    categoryColors,
    categoryRules,
    transactionCategories,
    savingsCategories,
    sharedCategories,
    addTransactionCategory,
    addSavingsCategory,
    addSharedCategory,
    addCategoryRule,
    updateCategoryRule,
    deleteCategoryRule,
    setCategoryColor,
    renameCategory,
    deleteCategory,
  } = useFinanceStore();

  const [transactionCategoryInput, setTransactionCategoryInput] = useState('');
  const [savingsCategoryInput, setSavingsCategoryInput] = useState('');
  const [rulePattern, setRulePattern] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState<CategoryRuleMatchType>('contains');
  const [ruleActive, setRuleActive] = useState(true);
  const [renameTarget, setRenameTarget] = useState<{ scope: 'transaction' | 'savings'; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ scope: 'transaction' | 'savings'; name: string } | null>(null);

  const mergedTransactionCategoryNames = useMemo(
    () => buildTransactionCategoryOptions(transactions, transactionCategories, sharedCategories),
    [transactions, transactionCategories, sharedCategories],
  );

  const transactionStats = useMemo(() => {
    const counts = new Map<string, number>();
    mergedTransactionCategoryNames.forEach((name) => counts.set(name, 0));

    transactions.forEach((transaction) => {
      const cats = (transaction.categories?.length ? transaction.categories : [transaction.category]).map(normalizeName).filter(Boolean);
      cats.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));
    });

    bills.forEach((bill) => {
      const name = normalizeName(bill.category);
      if (!name) return;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, count]) => ({
        name,
        count,
        color: getCategoryColor(name, categoryColors),
        note: sharedCategories.includes(name) ? 'Shared' : transactionCategories.includes(name) ? 'Custom' : 'Default',
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [bills, categoryColors, mergedTransactionCategoryNames, sharedCategories, transactionCategories, transactions]);

  const savingsCategoryNames = useMemo(
    () => [...new Set([...DEFAULT_SAVINGS_CATEGORIES, ...savingsCategories.map(normalizeName)].filter(Boolean))],
    [savingsCategories],
  );

  const savingsStats = useMemo(() => {
    const counts = new Map<string, number>();
    savingsGoals.forEach((goal: SavingsGoal) => {
      const name = normalizeName(goal.category);
      if (!name) return;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    return savingsCategoryNames.map((name) => ({
      name,
      count: counts.get(name) ?? 0,
      color: getCategoryColor(name, categoryColors),
      note: savingsCategories.includes(name) ? 'Custom' : 'Default',
    }));
  }, [categoryColors, savingsCategoryNames, savingsCategories, savingsGoals]);

  const activeRules = categoryRules.filter((rule) => rule.active);

  const handleAddTransactionCategory = () => {
    const next = normalizeName(transactionCategoryInput);
    if (!next) {
      toast.error('Enter a category name.');
      return;
    }
    // Transaction categories are shared with bills by default.
    addTransactionCategory(next);
    addSharedCategory(next);
    setTransactionCategoryInput('');
    toast.success('Transaction category added.');
  };

  const handleAddSavingsCategory = () => {
    const next = normalizeName(savingsCategoryInput);
    if (!next) {
      toast.error('Enter a category name.');
      return;
    }
    addSavingsCategory(next);
    setSavingsCategoryInput('');
    toast.success('Savings category added.');
  };

  const handleRename = (scope: 'transaction' | 'savings', name: string) => {
    setRenameTarget({ scope, name });
    setRenameValue(name);
  };

  const handleDelete = (scope: 'transaction' | 'savings', name: string) => {
    setDeleteTarget({ scope, name });
  };

  const handleConfirmRename = () => {
    if (!renameTarget) return;
    const next = normalizeName(renameValue);
    if (!next) {
      toast.error('Enter a category name.');
      return;
    }
    if (next === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    renameCategory(renameTarget.scope, renameTarget.name, next);
    toast.success(`Renamed to ${next}.`);
    setRenameTarget(null);
    setRenameValue('');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteCategory(deleteTarget.scope, deleteTarget.name);
    toast.success(`Deleted ${deleteTarget.name}.`);
    setDeleteTarget(null);
  };

  const handleAddRule = () => {
    const nextPattern = normalizeName(rulePattern);
    const nextCategory = normalizeName(ruleCategory);
    if (!nextPattern || !nextCategory) {
      toast.error('Enter a pattern and category.');
      return;
    }

    addCategoryRule({
      pattern: nextPattern,
      category: nextCategory,
      matchType: ruleMatchType,
      active: ruleActive,
    });
    setRulePattern('');
    setRuleCategory('');
    setRuleMatchType('contains');
    setRuleActive(true);
    toast.success('Category rule added.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage categories for transactions, bills, and savings in one place."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Tag className="h-4 w-4 text-primary" />
              Transaction + Bill categories
            </div>
            <div className="mt-3 text-2xl font-semibold">{transactionStats.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">Single merged list for transactions and bills.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Savings categories
            </div>
            <div className="mt-3 text-2xl font-semibold">{savingsStats.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">Used by savings goals.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Active rules
            </div>
            <div className="mt-3 text-2xl font-semibold">{activeRules.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">Automation rules for incoming transactions.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryListCard
          title="Transaction + Bill categories"
          description="Add one category list used by both transactions and bills."
          icon={Tag}
          items={transactionStats}
          emptyText="No categories yet. Add one to start organizing transactions and bills."
          inputValue={transactionCategoryInput}
          onInputChange={setTransactionCategoryInput}
          onAdd={handleAddTransactionCategory}
          inputPlaceholder="e.g. Groceries"
          helper="Rename/Delete is enabled here and applies to both transactions and bills."
          onColorChange={setCategoryColor}
          onRename={(name) => handleRename('transaction', name)}
          onDelete={(name) => handleDelete('transaction', name)}
        />

        <CategoryListCard
          title="Savings categories"
          description="Add categories used in savings goals."
          icon={Sparkles}
          items={savingsStats}
          emptyText="No savings categories yet. Add one for goals."
          inputValue={savingsCategoryInput}
          onInputChange={setSavingsCategoryInput}
          onAdd={handleAddSavingsCategory}
          inputPlaceholder="e.g. Retirement"
          helper="This also appears in the Savings Goals form category selector."
          onColorChange={setCategoryColor}
          onRename={(name) => handleRename('savings', name)}
          onDelete={(name) => handleDelete('savings', name)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Category rules
          </CardTitle>
          <CardDescription>Optional automation: map new transactions to a category when text matches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Pattern</Label>
              <Input value={rulePattern} onChange={(e) => setRulePattern(e.target.value)} placeholder="e.g. grab, salary, netflix" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} placeholder="e.g. Transport" list="category-options" />
              <datalist id="category-options">
                {mergedTransactionCategoryNames.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Match type</Label>
              <Select value={ruleMatchType} onValueChange={(value) => setRuleMatchType(value as CategoryRuleMatchType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATCH_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
              <div>
                <Label className="text-sm">Active</Label>
                <p className="text-xs text-muted-foreground">Disable to keep the rule but stop matching it.</p>
              </div>
              <Switch checked={ruleActive} onCheckedChange={setRuleActive} />
            </div>
          </div>

          <Button className="w-full sm:w-auto" onClick={handleAddRule}>
            <Plus className="mr-2 h-4 w-4" />
            Add rule
          </Button>

          <div className="space-y-3 pt-2">
            {categoryRules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No automation rules yet.
              </div>
            ) : (
              categoryRules.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-medium text-foreground">{rule.pattern}</div>
                        <Badge variant="secondary">{rule.matchType}</Badge>
                        <Badge variant={rule.active ? 'default' : 'outline'}>{rule.active ? 'Active' : 'Disabled'}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">Maps to <span className="font-medium text-foreground">{rule.category}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
                        <span className="text-xs text-muted-foreground">On</span>
                        <Switch
                          checked={rule.active}
                          onCheckedChange={(checked) => updateCategoryRule(rule.id, { active: checked })}
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCategoryRule(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="rename-category-input">New category name</Label>
            <Input
              id="rename-category-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter category name"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
              <Button onClick={handleConfirmRename}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Delete category "${deleteTarget.name}"?` : 'Delete category?'}
        description={'Existing records using this category will be moved to "Other".'}
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
