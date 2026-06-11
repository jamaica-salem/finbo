import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '@/store/financeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Trash2, Pencil, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { buildTransactionCategoryOptions } from '@/lib/transactionCategories';
import { DUE_ITEM_BADGE_LABELS, getDueItems, settleDueItem, type DueItem } from '@/lib/dueItems';
import type { RecurringTransactionFrequency } from '@/types/finance';

const formatDueDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const formatMonthLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
};

export default function BillsPage() {
  const {
    accounts,
    bills,
    loans,
    creditCards,
    personalDebts,
    addBill,
    updateBill,
    deleteBill,
    logLoanPayment,
    logCreditCardPayment,
    logPersonalDebtPayment,
    markBillPaid,
    currency,
    transactions,
    transactionCategories,
    sharedCategories,
  } = useFinanceStore();

  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [frequency, setFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [intervalDays, setIntervalDays] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('0');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecurring, setEditRecurring] = useState(true);
  const [editFrequency, setEditFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [editIntervalDays, setEditIntervalDays] = useState('');
  const [addErrors, setAddErrors] = useState<{ name?: string; amount?: string; dueDate?: string; intervalDays?: string }>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; amount?: string; dueDate?: string; intervalDays?: string }>({});
  const [pendingDelete, setPendingDelete] = useState<{ type: 'bill' | 'recurring'; id: string; label: string } | null>(null);
  const [duePaymentAccountId, setDuePaymentAccountId] = useState(accounts[0]?.id ?? '');

  const billCategories = useMemo(
    () => buildTransactionCategoryOptions(transactions, transactionCategories, sharedCategories),
    [transactions, transactionCategories, sharedCategories]
  );

  const dueItems = useMemo(
    () =>
      getDueItems({
        bills,
        loans,
        creditCards,
        personalDebts,
      }),
    [bills, loans, creditCards, personalDebts]
  );

  const monthGroups = useMemo(() => {
    const dueItemsByMonth = dueItems.reduce<Record<string, DueItem[]>>((groups, item) => {
      const date = new Date(`${item.dueDate}T00:00:00`);
      const monthKey = Number.isNaN(date.getTime())
        ? 'no-due-date'
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
      return groups;
    }, {});

    return Object.entries(dueItemsByMonth).sort(([left], [right]) => {
      if (left === 'no-due-date') return 1;
      if (right === 'no-due-date') return -1;
      return left.localeCompare(right);
    });
  }, [dueItems]);

  const recurringBills = bills
    .filter((bill) => bill.recurring)
    .slice()
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  const handleAdd = () => {
    setAddErrors({});
    const errors: typeof addErrors = {};

    if (!name.trim()) errors.name = 'Bill name is required';
    if (!(parseFloat(amount) > 0)) errors.amount = 'Amount must be greater than 0';
    if (!dueDate) errors.dueDate = 'Due date is required';
    if (recurring && frequency === 'custom' && !(parseInt(intervalDays, 10) > 0)) {
      errors.intervalDays = 'Interval must be greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    addBill({
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      category: category || 'Other',
      dueDate,
      recurring,
      frequency: recurring ? frequency : undefined,
      intervalDays: recurring && frequency === 'custom' ? parseInt(intervalDays, 10) || undefined : undefined,
      status: 'pending',
    });

    setName('');
    setAmount('0');
    setCategory('');
    setDueDate('');
    setRecurring(true);
    setFrequency('monthly');
    setIntervalDays('');
    setAddErrors({});
    setShowAdd(false);
  };

  const handleDelete = (billId: string) => {
    const bill = bills.find((item) => item.id === billId);
    if (!bill) return;
    setPendingDelete({ type: 'bill', id: billId, label: bill.name });
  };

  const confirmDeleteBill = () => {
    if (!pendingDelete) return;
    deleteBill(pendingDelete.id);
    setPendingDelete(null);
  };

  const openEdit = (id: string) => {
    const bill = bills.find((item) => item.id === id);
    if (!bill) return;

    setEditId(id);
    setEditName(bill.name);
    setEditAmount(String(bill.amount));
    setEditCategory(bill.category);
    setEditDueDate(bill.dueDate);
    setEditRecurring(bill.recurring);
    setEditFrequency((bill as any).frequency ?? 'monthly');
    setEditIntervalDays((bill as any).intervalDays ? String((bill as any).intervalDays) : '');
    setEditErrors({});
  };

  const handleEdit = () => {
    setEditErrors({});
    const errors: typeof editErrors = {};

    if (!editId) return;
    if (!editName.trim()) errors.name = 'Bill name is required';
    if (!(parseFloat(editAmount) > 0)) errors.amount = 'Amount must be greater than 0';
    if (!editDueDate) errors.dueDate = 'Due date is required';
    if (editRecurring && editFrequency === 'custom' && !(parseInt(editIntervalDays, 10) > 0)) {
      errors.intervalDays = 'Interval must be greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    updateBill(editId, {
      name: editName.trim(),
      amount: parseFloat(editAmount) || 0,
      category: editCategory || 'Other',
      dueDate: editDueDate,
      recurring: editRecurring,
      frequency: editRecurring ? editFrequency : undefined,
      intervalDays: editRecurring && editFrequency === 'custom' ? parseInt(editIntervalDays, 10) || undefined : undefined,
    });

    setEditErrors({});
    setEditId(null);
  };

  const handleMarkDueItemPaid = (item: DueItem) => {
    if (!duePaymentAccountId) {
      toast.error('Choose a payment account');
      return;
    }
    const handled = settleDueItem(item, {
      markBillPaid,
      logLoanPayment,
      logCreditCardPayment,
      logPersonalDebtPayment,
    }, undefined, duePaymentAccountId);
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

  const renderDueItem = (item: DueItem) => (
    <div
      key={item.id}
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-4 py-3',
        item.status === 'overdue' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'
      )}
    >
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

      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">{currency}{item.amount.toFixed(2)}</p>
          <p className={cn('text-xs font-medium', item.status === 'overdue' ? 'text-destructive' : 'text-warning')}>
            {item.status === 'overdue' ? 'Overdue' : 'Pending'}
          </p>
        </div>

        {item.sourceType === 'bill' ? (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(item.sourceId)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleDelete(item.sourceId)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );

  const hasAnyDueSources = bills.length > 0 || loans.length > 0 || creditCards.length > 0 || personalDebts.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills & Due Dates"
        description="Manage recurring bills and track all upcoming due dates"
        actions={
          <Dialog
            open={showAdd}
            onOpenChange={(open) => {
              setShowAdd(open);
              if (!open) setAddErrors({});
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Bill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Bill</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Bill name</Label>
                  <Input placeholder="e.g. Netflix" value={name} onChange={(event) => setName(event.target.value)} />
                  {addErrors.name ? <p className="text-sm text-destructive">{addErrors.name}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input placeholder="0.00" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
                  {addErrors.amount ? <p className="text-sm text-destructive">{addErrors.amount}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {billCategories.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(event) => setDueDate(event.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {addErrors.dueDate ? <p className="text-sm text-destructive">{addErrors.dueDate}</p> : null}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label className="text-foreground">Recurring</Label>
                  <Switch checked={recurring} onCheckedChange={setRecurring} />
                </div>
                {recurring ? (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="space-y-1.5">
                      <Label>Frequency</Label>
                      <Select value={frequency} onValueChange={(value) => setFrequency(value as RecurringTransactionFrequency)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                    {frequency === 'custom' ? (
                      <div className="space-y-1.5">
                        <Label>Interval (days)</Label>
                        <Input placeholder="30" type="number" value={intervalDays} onChange={(event) => setIntervalDays(event.target.value)} />
                        {addErrors.intervalDays ? <p className="text-sm text-destructive">{addErrors.intervalDays}</p> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <Button className="mt-2 w-full" onClick={handleAdd}>
                  Add Bill
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog
        open={Boolean(editId)}
        onOpenChange={() => {
          setEditId(null);
          setEditErrors({});
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bill name</Label>
              <Input placeholder="e.g. Netflix" value={editName} onChange={(event) => setEditName(event.target.value)} />
              {editErrors.name ? <p className="text-sm text-destructive">{editErrors.name}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input placeholder="0.00" type="number" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} />
              {editErrors.amount ? <p className="text-sm text-destructive">{editErrors.amount}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {billCategories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input 
                type="date" 
                value={editDueDate} 
                onChange={(event) => setEditDueDate(event.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              {editErrors.dueDate ? <p className="text-sm text-destructive">{editErrors.dueDate}</p> : null}
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="text-foreground">Recurring</Label>
              <Switch checked={editRecurring} onCheckedChange={setEditRecurring} />
            </div>
            {editRecurring ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select value={editFrequency} onValueChange={(value) => setEditFrequency(value as RecurringTransactionFrequency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                {editFrequency === 'custom' ? (
                  <div className="space-y-1.5">
                    <Label>Interval (days)</Label>
                    <Input placeholder="30" type="number" value={editIntervalDays} onChange={(event) => setEditIntervalDays(event.target.value)} />
                    {editErrors.intervalDays ? <p className="text-sm text-destructive">{editErrors.intervalDays}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <Button className="mt-2 w-full" onClick={handleEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={pendingDelete?.type === 'recurring' ? 'Delete recurring bill?' : 'Delete bill?'}
        description={pendingDelete ? `Are you sure you want to delete "${pendingDelete.label}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDeleteBill}
      />

      <div className="glass-card space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-foreground">Recurring bills automation</h3>
            <p className="mt-1 text-sm text-muted-foreground">Bills that auto-roll over on due dates.</p>
          </div>
          <Badge variant="secondary">{recurringBills.length} recurring</Badge>
        </div>

        {recurringBills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring bills yet. Add one to automate payments.</p>
        ) : (
          <div className="space-y-3">
            {recurringBills.map((bill) => (
              <div key={bill.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{bill.name}</p>
                      <Badge variant={(bill as any).active !== false ? 'default' : 'secondary'}>
                        {(bill as any).active !== false ? 'Active' : 'Paused'}
                      </Badge>
                      <Badge variant="outline">{bill.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currency}{bill.amount.toFixed(2)} - Due: {formatDueDate(bill.dueDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(bill as any).frequency ?? 'monthly'}
                      {(bill as any).frequency === 'custom' && (bill as any).intervalDays
                        ? ` every ${(bill as any).intervalDays} days`
                        : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1">
                      <span className="text-xs text-muted-foreground">Enabled</span>
                      <Switch
                        checked={(bill as any).active !== false}
                        onCheckedChange={(checked) => updateBill(bill.id, { active: checked })}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(bill.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => setPendingDelete({ type: 'recurring', id: bill.id, label: bill.name })}
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

      {monthGroups.length > 0 ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="w-full sm:w-56">
              <Select value={duePaymentAccountId} onValueChange={setDuePaymentAccountId} disabled={!accounts.length}>
                <SelectTrigger><SelectValue placeholder="Pay from account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {monthGroups.map(([monthKey, monthItems]) => {
            const heading = monthKey === 'no-due-date' ? 'No Due Date' : formatMonthLabel(monthItems[0].dueDate);

            return (
              <div key={monthKey}>
                <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">{heading}</h2>
                <div className="space-y-2">{monthItems.map(renderDueItem)}</div>
              </div>
            );
          })}
        </div>
      ) : null}

      {hasAnyDueSources && dueItems.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No upcoming bills or due dates right now.</p>
        </div>
      ) : null}

      {!hasAnyDueSources ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No bills, loans, credit cards, or debt due dates added yet.</p>
        </div>
      ) : null}
    </div>
  );
}
