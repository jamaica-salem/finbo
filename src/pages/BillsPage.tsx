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
import { Plus, Trash2, Check, Undo2, Pencil, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { buildTransactionCategoryOptions } from '@/lib/transactionCategories';
import type { RecurringTransactionFrequency } from '@/types/finance';
const formatDueDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};
const formatMonthLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
};

export default function BillsPage() {
  const { bills, addBill, updateBill, deleteBill, markBillPaid, currency, transactions, transactionCategories, sharedCategories } = useFinanceStore();
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [frequency, setFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [intervalDays, setIntervalDays] = useState('');

  // Edit state
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
  const billCategories = useMemo(() => buildTransactionCategoryOptions(transactions, transactionCategories, sharedCategories), [transactions, transactionCategories, sharedCategories]);

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
    const b = bills.find(x => x.id === id);
    if (!b) return;
    setEditId(id);
    setEditName(b.name);
    setEditAmount(String(b.amount));
    setEditCategory(b.category);
    setEditDueDate(b.dueDate);
    setEditRecurring(b.recurring);
    setEditFrequency((b as any).frequency ?? 'monthly');
    setEditIntervalDays((b as any).intervalDays ? String((b as any).intervalDays) : '');
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

  const today = new Date();
  const getDueTime = (value: string) => {
    const time = new Date(`${value}T00:00:00`).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  };
  const isOverdue = (bill: typeof bills[0]) => bill.status === 'overdue' || (bill.status === 'pending' && getDueTime(bill.dueDate) < today.getTime());
  const activeBills = bills.filter((bill) => bill.status !== 'paid');
  const sortedBills = [...activeBills].sort((a, b) => getDueTime(a.dueDate) - getDueTime(b.dueDate));
  const billsByMonth = sortedBills.reduce<Record<string, typeof bills>>((groups, bill) => {
    const date = new Date(`${bill.dueDate}T00:00:00`);
    const monthKey = Number.isNaN(date.getTime()) ? 'no-due-date' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(bill);
    return groups;
  }, {});
  const monthGroups = Object.entries(billsByMonth).sort(([keyA], [keyB]) => {
    if (keyA === 'no-due-date') return 1;
    if (keyB === 'no-due-date') return -1;
    return keyA.localeCompare(keyB);
  });

  const renderBill = (b: typeof bills[0]) => (
    <div key={b.id} className={cn(
      'flex items-center justify-between py-3 px-4 rounded-lg border',
      isOverdue(b)
        ? 'border-destructive/30 bg-destructive/5'
        : b.status === 'paid'
          ? 'border-success/30 bg-success/5'
          : 'border-border bg-card'
    )}>
      <div>
        <p className="text-sm font-medium text-foreground">{b.name}</p>
        <p className="text-xs text-muted-foreground">{b.category} · Due Date: {formatDueDate(b.dueDate)} {b.recurring && '· Recurring'}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{currency}{b.amount.toFixed(2)}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => markBillPaid(b.id)}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(b.id)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleDelete(b.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills & Due Dates"
        description="Manage recurring and one-time bills"
        actions={
        <Dialog
          open={showAdd}
          onOpenChange={(open) => {
            setShowAdd(open);
            if (!open) setAddErrors({});
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Bill</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Bill</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Bill name</Label>
                <Input placeholder="e.g. Netflix" value={name} onChange={(e) => setName(e.target.value)} />
                {addErrors.name ? <p className="text-sm text-destructive">{addErrors.name}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input placeholder="0.00" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {addErrors.amount ? <p className="text-sm text-destructive">{addErrors.amount}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {billCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                {addErrors.dueDate ? <p className="text-sm text-destructive">{addErrors.dueDate}</p> : null}
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label className="text-foreground">Recurring</Label>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>
              {recurring && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringTransactionFrequency)}>
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
                  {frequency === 'custom' && (
                    <div className="space-y-1.5">
                      <Label>Interval (days)</Label>
                      <Input placeholder="30" type="number" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
                      {addErrors.intervalDays ? <p className="text-sm text-destructive">{addErrors.intervalDays}</p> : null}
                    </div>
                  )}
                </div>
              )}
              <Button className="w-full mt-2" onClick={handleAdd}>Add Bill</Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Edit Bill Dialog */}
      <Dialog
        open={!!editId}
        onOpenChange={() => {
          setEditId(null);
          setEditErrors({});
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bill name</Label>
              <Input placeholder="e.g. Netflix" value={editName} onChange={(e) => setEditName(e.target.value)} />
              {editErrors.name ? <p className="text-sm text-destructive">{editErrors.name}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input placeholder="0.00" type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              {editErrors.amount ? <p className="text-sm text-destructive">{editErrors.amount}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {billCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              {editErrors.dueDate ? <p className="text-sm text-destructive">{editErrors.dueDate}</p> : null}
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="text-foreground">Recurring</Label>
              <Switch checked={editRecurring} onCheckedChange={setEditRecurring} />
            </div>
            {editRecurring && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select value={editFrequency} onValueChange={(v) => setEditFrequency(v as RecurringTransactionFrequency)}>
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
                {editFrequency === 'custom' && (
                  <div className="space-y-1.5">
                    <Label>Interval (days)</Label>
                    <Input placeholder="30" type="number" value={editIntervalDays} onChange={(e) => setEditIntervalDays(e.target.value)} />
                    {editErrors.intervalDays ? <p className="text-sm text-destructive">{editErrors.intervalDays}</p> : null}
                  </div>
                )}
              </div>
            )}
            <Button className="w-full mt-2" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={pendingDelete?.type === 'recurring' ? "Delete recurring bill?" : "Delete bill?"}
        description={
          pendingDelete ? `Are you sure you want to delete "${pendingDelete.label}"? This action cannot be undone.` : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDeleteBill}
      />

      {/* Recurring Bills Automation */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-foreground">Recurring bills automation</h3>
            <p className="text-sm text-muted-foreground mt-1">Bills that auto-roll over on due dates.</p>
          </div>
          <Badge variant="secondary">{bills.filter((b) => b.recurring).length} recurring</Badge>
        </div>

        {bills.filter((b) => b.recurring).length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring bills yet. Add one to automate payments.</p>
        ) : (
          <div className="space-y-3">
            {bills
              .filter((b) => b.recurring)
              .slice()
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .map((bill) => (
                <div key={bill.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{bill.name}</p>
                        <Badge variant={(bill as any).active !== false ? 'default' : 'secondary'}>{(bill as any).active !== false ? 'Active' : 'Paused'}</Badge>
                        <Badge variant="outline">{bill.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {currency}{bill.amount.toFixed(2)} · Due: {formatDueDate(bill.dueDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(bill as any).frequency ?? 'monthly'}
                        {(bill as any).frequency === 'custom' && (bill as any).intervalDays ? ` every ${(bill as any).intervalDays} days` : ''}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => openEdit(bill.id)}
                      >
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

      {monthGroups.length > 0 && (
        <div className="space-y-6">
          {monthGroups.map(([monthKey, monthBills]) => {
            const heading = monthKey === 'no-due-date'
              ? 'No Due Date'
              : formatMonthLabel(monthBills[0].dueDate);

            return (
              <div key={monthKey}>
                <h2 className="mb-3 font-heading text-lg font-semibold text-foreground">{heading}</h2>
                <div className="space-y-2">{monthBills.map(renderBill)}</div>
              </div>
            );
          })}
        </div>
      )}

      {bills.length > 0 && activeBills.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">All bills have been marked paid.</p>
        </div>
      )}

      {bills.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No bills added yet.</p>
        </div>
      )}
    </div>
  );
}
