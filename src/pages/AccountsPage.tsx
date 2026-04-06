import { useEffect, useMemo, useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Wallet, Building2, Smartphone, Pencil, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { buildTransactionCategoryOptions, getCategoryColor } from '@/lib/transactionCategories';
import type { AccountType, RecurringTransactionFrequency } from '@/types/finance';
const ACCOUNT_ICONS: Record<AccountType, React.ElementType> = { bank: Building2, cash: Wallet, 'e-wallet': Smartphone };

export default function AccountsPage() {
  const {
    accounts,
    transactions,
    recurringTransactionRules,
    categoryColors,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addRecurringTransactionRule,
    updateRecurringTransactionRule,
    deleteRecurringTransactionRule,
    currency,
  } = useFinanceStore();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [editRecurringId, setEditRecurringId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { type: 'account'; id: string; label: string }
    | { type: 'transaction'; id: string; label: string }
    | { type: 'rule'; id: string; label: string }
    | null
  >(null);

  // Edit account
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editAName, setEditAName] = useState('');
  const [editAType, setEditAType] = useState<AccountType>('bank');
  const [editABal, setEditABal] = useState('0');

  // Add account form
  const [aName, setAName] = useState('');
  const [aType, setAType] = useState<AccountType>('bank');
  const [aBal, setABal] = useState('0');

  // Add transaction form
  const [txAccount, setTxAccount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState('0');
  const [txCategory, setTxCategory] = useState('');
  const [txExtraCategory, setTxExtraCategory] = useState('');
  const [txTags, setTxTags] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit transaction form
  const [editTxAccount, setEditTxAccount] = useState('');
  const [editTxType, setEditTxType] = useState<'income' | 'expense'>('expense');
  const [editTxAmount, setEditTxAmount] = useState('0');
  const [editTxCategory, setEditTxCategory] = useState('');
  const [editTxExtraCategory, setEditTxExtraCategory] = useState('');
  const [editTxTags, setEditTxTags] = useState('');
  const [editTxDesc, setEditTxDesc] = useState('');
  const [editTxDate, setEditTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Recurring transaction rule
  const [ruleLabel, setRuleLabel] = useState('');
  const [ruleAccountId, setRuleAccountId] = useState(accounts[0]?.id ?? '');
  const [ruleType, setRuleType] = useState<'income' | 'expense'>('expense');
  const [ruleAmount, setRuleAmount] = useState('0');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleFrequency, setRuleFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [ruleIntervalDays, setRuleIntervalDays] = useState('30');
  const [ruleStartDate, setRuleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [ruleNextRunDate, setRuleNextRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [ruleEndDate, setRuleEndDate] = useState('');
  const [ruleActive, setRuleActive] = useState(true);

  // Edit recurring rule
  const [editRuleLabel, setEditRuleLabel] = useState('');
  const [editRuleAccountId, setEditRuleAccountId] = useState(accounts[0]?.id ?? '');
  const [editRuleType, setEditRuleType] = useState<'income' | 'expense'>('expense');
  const [editRuleAmount, setEditRuleAmount] = useState('0');
  const [editRuleCategory, setEditRuleCategory] = useState('');
  const [editRuleDescription, setEditRuleDescription] = useState('');
  const [editRuleFrequency, setEditRuleFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [editRuleIntervalDays, setEditRuleIntervalDays] = useState('30');
  const [editRuleStartDate, setEditRuleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [editRuleNextRunDate, setEditRuleNextRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [editRuleEndDate, setEditRuleEndDate] = useState('');
  const [editRuleActive, setEditRuleActive] = useState(true);

  useEffect(() => {
    if (!accounts.length) {
      setRuleAccountId('');
      setEditRuleAccountId('');
      return;
    }

    if (!accounts.some((account) => account.id === ruleAccountId)) {
      setRuleAccountId(accounts[0].id);
    }
    if (!accounts.some((account) => account.id === editRuleAccountId)) {
      setEditRuleAccountId(accounts[0].id);
    }
  }, [accounts, editRuleAccountId, ruleAccountId]);

  const handleAddAccount = () => {
    if (!aName) return;
    addAccount({ name: aName, type: aType, balance: parseFloat(aBal) || 0, currency, color: 'hsl(172, 66%, 40%)' });
    setAName(''); setABal('0'); setShowAddAccount(false);
  };

  const openEditAccount = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    setEditAccountId(id);
    setEditAName(acc.name);
    setEditAType(acc.type);
    setEditABal(String(acc.balance));
  };

  const handleEditAccount = () => {
    if (!editAccountId || !editAName) return;
    updateAccount(editAccountId, { name: editAName, type: editAType, balance: parseFloat(editABal) || 0 });
    setEditAccountId(null);
  };

  const handleAddTx = () => {
    const primaryCategory = txCategory.trim() || txExtraCategory.trim();
    const extraCategory = txCategory.trim() && txExtraCategory.trim() && txExtraCategory.trim() !== txCategory.trim()
      ? txExtraCategory.trim()
      : '';

    if (!txAccount || !txAmount || !primaryCategory) return;

    addTransaction({
      accountId: txAccount,
      type: txType,
      amount: parseFloat(txAmount),
      category: primaryCategory,
      categories: [primaryCategory, extraCategory].filter(Boolean),
      tags: txTags.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean),
      description: txDesc,
      date: txDate,
    });
    setTxAmount('');
    setTxExtraCategory('');
    setTxTags('');
    setTxDesc('');
    setShowAddTx(false);
  };

  const openEditTransaction = (txId: string) => {
    const tx = transactions.find((item) => item.id === txId);
    if (!tx) return;
    const txCategories = tx.categories?.length ? tx.categories : [tx.category];
    const primaryCategory = txCategories[0] ?? tx.category;
    const extraCategory = txCategories[1] ?? '';

    setEditTxId(txId);
    setEditTxAccount(tx.accountId);
    setEditTxType(tx.type);
    setEditTxAmount(String(tx.amount));
    setEditTxCategory(primaryCategory);
    setEditTxExtraCategory(extraCategory);
    setEditTxTags((tx.tags ?? []).join(', '));
    setEditTxDesc(tx.description);
    setEditTxDate(tx.date);
  };

  const handleEditTx = () => {
    if (!editTxId || !editTxAccount || !editTxAmount) return;

    const primaryCategory = editTxCategory.trim() || editTxExtraCategory.trim();
    const extraCategory = editTxCategory.trim() && editTxExtraCategory.trim() && editTxExtraCategory.trim() !== editTxCategory.trim()
      ? editTxExtraCategory.trim()
      : '';

    if (!primaryCategory) return;

    updateTransaction(editTxId, {
      accountId: editTxAccount,
      type: editTxType,
      amount: parseFloat(editTxAmount) || 0,
      category: primaryCategory,
      categories: [primaryCategory, extraCategory].filter(Boolean),
      tags: editTxTags.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean),
      description: editTxDesc,
      date: editTxDate,
    });

    setEditTxId(null);
  };

  const handleAddRecurringRule = () => {
    if (!ruleLabel.trim() || !ruleAccountId || !ruleAmount || !ruleCategory) return;

    addRecurringTransactionRule({
      label: ruleLabel.trim(),
      accountId: ruleAccountId,
      type: ruleType,
      amount: parseFloat(ruleAmount) || 0,
      category: ruleCategory,
      description: ruleDescription.trim(),
      frequency: ruleFrequency,
      intervalDays: ruleFrequency === 'custom' ? Math.max(1, parseInt(ruleIntervalDays, 10) || 1) : undefined,
      startDate: ruleStartDate,
      nextRunDate: ruleNextRunDate || ruleStartDate,
      endDate: ruleEndDate || undefined,
      active: ruleActive,
    });

    setRuleLabel('');
    setRuleType('expense');
    setRuleAmount('0');
    setRuleCategory('');
    setRuleDescription('');
    setRuleFrequency('monthly');
    setRuleIntervalDays('30');
    setRuleStartDate(new Date().toISOString().split('T')[0]);
    setRuleNextRunDate(new Date().toISOString().split('T')[0]);
    setRuleEndDate('');
    setRuleActive(true);
    setShowRecurring(false);
  };

  const openEditRecurringRule = (ruleId: string) => {
    const rule = recurringTransactionRules.find((item) => item.id === ruleId);
    if (!rule) return;

    setEditRecurringId(ruleId);
    setEditRuleLabel(rule.label);
    setEditRuleAccountId(rule.accountId);
    setEditRuleType(rule.type);
    setEditRuleAmount(String(rule.amount));
    setEditRuleCategory(rule.category);
    setEditRuleDescription(rule.description);
    setEditRuleFrequency(rule.frequency);
    setEditRuleIntervalDays(String(rule.intervalDays ?? 30));
    setEditRuleStartDate(rule.startDate);
    setEditRuleNextRunDate(rule.nextRunDate);
    setEditRuleEndDate(rule.endDate ?? '');
    setEditRuleActive(rule.active);
  };

  const handleEditRecurringRule = () => {
    if (!editRecurringId || !editRuleLabel.trim() || !editRuleAccountId || !editRuleAmount || !editRuleCategory) return;

    updateRecurringTransactionRule(editRecurringId, {
      label: editRuleLabel.trim(),
      accountId: editRuleAccountId,
      type: editRuleType,
      amount: parseFloat(editRuleAmount) || 0,
      category: editRuleCategory,
      description: editRuleDescription.trim(),
      frequency: editRuleFrequency,
      intervalDays: editRuleFrequency === 'custom' ? Math.max(1, parseInt(editRuleIntervalDays, 10) || 1) : undefined,
      startDate: editRuleStartDate,
      nextRunDate: editRuleNextRunDate || editRuleStartDate,
      endDate: editRuleEndDate || undefined,
      active: editRuleActive,
    });

    setEditRecurringId(null);
  };

  const filteredTx = selectedAccount
    ? transactions.filter((t) => t.accountId === selectedAccount)
    : transactions;
  const transactionCategories = useMemo(() => buildTransactionCategoryOptions(transactions), [transactions]);
  const confirmPendingDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.type === 'account') {
      deleteAccount(pendingDelete.id);
    } else if (pendingDelete.type === 'transaction') {
      deleteTransaction(pendingDelete.id);
    } else if (pendingDelete.type === 'rule') {
      deleteRecurringTransactionRule(pendingDelete.id);
    }

    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage your accounts and transactions"
        actions={
          <>
            <Dialog open={showRecurring} onOpenChange={setShowRecurring}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Repeat2 className="h-4 w-4 mr-1" />Recurring</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Add Recurring Rule</DialogTitle></DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Rule label</Label>
                    <Input placeholder="e.g. Monthly salary" value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account</Label>
                    <Select value={ruleAccountId} onValueChange={setRuleAccountId} disabled={!accounts.length}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={ruleType} onValueChange={(v) => setRuleType(v as 'income' | 'expense')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input type="number" min="0" step="0.01" value={ruleAmount} onChange={(e) => setRuleAmount(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={ruleCategory} onValueChange={setRuleCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {transactionCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Description</Label>
                    <Input placeholder="e.g. Monthly payroll" value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Select value={ruleFrequency} onValueChange={(v) => setRuleFrequency(v as RecurringTransactionFrequency)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Next run date</Label>
                    <Input type="date" value={ruleNextRunDate} onChange={(e) => setRuleNextRunDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Start date</Label>
                    <Input type="date" value={ruleStartDate} onChange={(e) => setRuleStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End date</Label>
                    <Input type="date" value={ruleEndDate} onChange={(e) => setRuleEndDate(e.target.value)} />
                  </div>
                  {ruleFrequency === 'custom' && (
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Custom interval in days</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={ruleIntervalDays}
                        onChange={(e) => setRuleIntervalDays(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 md:col-span-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Active</p>
                      <p className="text-xs text-muted-foreground">Run automatically on due dates</p>
                    </div>
                    <Switch checked={ruleActive} onCheckedChange={setRuleActive} />
                  </div>
                  <Button className="md:col-span-2" onClick={handleAddRecurringRule} disabled={!accounts.length}>
                    Save recurring rule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Account name</Label>
                  <Input placeholder="e.g. Main Bank" value={aName} onChange={(e) => setAName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={aType} onValueChange={(v) => setAType(v as AccountType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="e-wallet">E-Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Initial balance</Label>
                  <Input placeholder="0.00" type="number" value={aBal} onChange={(e) => setABal(e.target.value)} />
                </div>
                <Button className="w-full mt-2" onClick={handleAddAccount}>Add Account</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddTx} onOpenChange={setShowAddTx}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Transaction</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Select value={txAccount} onValueChange={setTxAccount}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction type</Label>
                  <Select value={txType} onValueChange={(v) => setTxType(v as 'income' | 'expense')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input placeholder="0.00" type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={txCategory} onValueChange={setTxCategory}>
                    <SelectTrigger><SelectValue placeholder="Select a category or add a new one" /></SelectTrigger>
                    <SelectContent>
                      {transactionCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Add category</Label>
                  <Input placeholder="e.g. Groceries - Delivery" value={txExtraCategory} onChange={(e) => setTxExtraCategory(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tags</Label>
                  <Input placeholder="e.g. monthly, family, reimbursable" value={txTags} onChange={(e) => setTxTags(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input placeholder="e.g. Groceries" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
                </div>
                <Button className="w-full mt-2" onClick={handleAddTx}>Add Transaction</Button>
              </div>
            </DialogContent>
          </Dialog>
          </>
        }
      />

      {/* Edit Account Dialog */}
      <Dialog open={!!editAccountId} onOpenChange={() => setEditAccountId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input placeholder="e.g. Main Bank" value={editAName} onChange={(e) => setEditAName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editAType} onValueChange={(v) => setEditAType(v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="e-wallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Balance</Label>
              <Input placeholder="0.00" type="number" value={editABal} onChange={(e) => setEditABal(e.target.value)} />
            </div>
            <Button className="w-full mt-2" onClick={handleEditAccount}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTxId} onOpenChange={() => setEditTxId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={editTxAccount} onValueChange={setEditTxAccount}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Transaction type</Label>
              <Select value={editTxType} onValueChange={(v) => setEditTxType(v as 'income' | 'expense')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input placeholder="0.00" type="number" value={editTxAmount} onChange={(e) => setEditTxAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editTxCategory} onValueChange={setEditTxCategory}>
                <SelectTrigger><SelectValue placeholder="Select a category or add a new one" /></SelectTrigger>
                <SelectContent>
                  {transactionCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Add category</Label>
              <Input placeholder="e.g. Groceries - Delivery" value={editTxExtraCategory} onChange={(e) => setEditTxExtraCategory(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Input placeholder="e.g. monthly, family, reimbursable" value={editTxTags} onChange={(e) => setEditTxTags(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="e.g. Groceries" value={editTxDesc} onChange={(e) => setEditTxDesc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editTxDate} onChange={(e) => setEditTxDate(e.target.value)} />
            </div>
            <Button className="w-full mt-2" onClick={handleEditTx}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRecurringId} onOpenChange={() => setEditRecurringId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Recurring Rule</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Rule label</Label>
              <Input placeholder="e.g. Monthly salary" value={editRuleLabel} onChange={(e) => setEditRuleLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={editRuleAccountId} onValueChange={setEditRuleAccountId} disabled={!accounts.length}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editRuleType} onValueChange={(v) => setEditRuleType(v as 'income' | 'expense')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={editRuleAmount} onChange={(e) => setEditRuleAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editRuleCategory} onValueChange={setEditRuleCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {transactionCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Input placeholder="e.g. Monthly payroll" value={editRuleDescription} onChange={(e) => setEditRuleDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={editRuleFrequency} onValueChange={(v) => setEditRuleFrequency(v as RecurringTransactionFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Next run date</Label>
              <Input type="date" value={editRuleNextRunDate} onChange={(e) => setEditRuleNextRunDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={editRuleStartDate} onChange={(e) => setEditRuleStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={editRuleEndDate} onChange={(e) => setEditRuleEndDate(e.target.value)} />
            </div>
            {editRuleFrequency === 'custom' && (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Custom interval in days</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={editRuleIntervalDays}
                  onChange={(e) => setEditRuleIntervalDays(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Run automatically on due dates</p>
              </div>
              <Switch checked={editRuleActive} onCheckedChange={setEditRuleActive} />
            </div>
            <Button className="md:col-span-2" onClick={handleEditRecurringRule} disabled={!accounts.length}>
              Save recurring rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-foreground">Recurring automation</h3>
            <p className="text-sm text-muted-foreground mt-1">Transactions that the scheduler creates automatically on due dates.</p>
          </div>
          <Badge variant="secondary">{recurringTransactionRules.length} rules</Badge>
        </div>

        {recurringTransactionRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring rules yet. Add one to automate income or expenses.</p>
        ) : (
          <div className="space-y-3">
            {recurringTransactionRules
              .slice()
              .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
              .map((rule) => (
                <div key={rule.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{rule.label}</p>
                        <Badge variant={rule.active ? 'default' : 'secondary'}>{rule.active ? 'Active' : 'Paused'}</Badge>
                        <Badge variant="outline" className="capitalize">{rule.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.category} · {rule.description || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Next run: {rule.nextRunDate} · {rule.frequency}
                        {rule.frequency === 'custom' && rule.intervalDays ? ` every ${rule.intervalDays} days` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1">
                        <span className="text-xs text-muted-foreground">Enabled</span>
                        <Switch
                          checked={rule.active}
                          onCheckedChange={(checked) => updateRecurringTransactionRule(rule.id, { active: checked })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => openEditRecurringRule(rule.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setPendingDelete({ type: 'rule', id: rule.id, label: rule.label })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((a) => {
          const Icon = ACCOUNT_ICONS[a.type];
          return (
            <div
              key={a.id}
              onClick={() => setSelectedAccount(selectedAccount === a.id ? null : a.id)}
              className={cn(
                'glass-card rounded-xl p-5 cursor-pointer transition-all hover:shadow-md',
                selectedAccount === a.id && 'ring-2 ring-primary'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{a.type}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEditAccount(a.id); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setPendingDelete({ type: 'account', id: a.id, label: a.name }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xl font-heading font-bold text-foreground mt-3">{currency}{a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          );
        })}
      </div>

      {/* Transactions */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-4">
          {selectedAccount ? `Transactions — ${accounts.find(a => a.id === selectedAccount)?.name}` : 'All Transactions'}
        </h3>
        <div className="space-y-2">
          {filteredTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            filteredTx.sort((a, b) => b.date.localeCompare(a.date)).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center',
                    tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  )}>
                    {tx.type === 'income' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tx.description || tx.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {(tx.categories?.length ? tx.categories : [tx.category]).map((category, index) => (
                        <span key={`${tx.id}-${category}`} className="inline-flex items-center">
                          {index > 0 ? <span className="mx-1">·</span> : null}
                          <span
                            className="mr-1 inline-flex h-2 w-2 rounded-full"
                            style={{ backgroundColor: getCategoryColor(category, categoryColors, index) }}
                          />
                          {category}
                        </span>
                      ))} · {tx.date}
                    </p>
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tx.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tx.recurringRuleId ? <Badge variant="secondary">Recurring</Badge> : null}
                  <p className={cn('text-sm font-semibold', tx.type === 'income' ? 'text-success' : 'text-destructive')}>
                    {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toFixed(2)}
                  </p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEditTransaction(tx.id)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setPendingDelete({ type: 'transaction', id: tx.id, label: tx.description || tx.category })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={
          pendingDelete?.type === 'account'
            ? 'Delete account?'
            : pendingDelete?.type === 'transaction'
              ? 'Delete transaction?'
              : 'Delete recurring rule?'
        }
        description={
          pendingDelete
            ? `Are you sure you want to delete ${pendingDelete.type} "${pendingDelete.label}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmPendingDelete}
      />
    </div>
  );
}
