import { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Check, Undo2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const BILL_CATEGORIES = ['Utilities', 'Entertainment', 'Insurance', 'Health', 'Transport', 'Subscription', 'Other'];
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
  const { bills, addBill, updateBill, deleteBill, markBillPaid, markBillUnpaid, currency } = useFinanceStore();
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(true);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecurring, setEditRecurring] = useState(true);

  const handleAdd = () => {
    if (!name || !dueDate) return;
    addBill({ name, amount: parseFloat(amount) || 0, category: category || 'Other', dueDate, recurring, status: 'pending' });
    setName(''); setAmount('0'); setCategory(''); setDueDate(''); setShowAdd(false);
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
  };

  const handleEdit = () => {
    if (!editId || !editName || !editDueDate) return;
    updateBill(editId, {
      name: editName,
      amount: parseFloat(editAmount) || 0,
      category: editCategory || 'Other',
      dueDate: editDueDate,
      recurring: editRecurring,
    });
    setEditId(null);
  };

  const today = new Date();
  const getDueTime = (value: string) => {
    const time = new Date(`${value}T00:00:00`).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  };
  const isOverdue = (bill: typeof bills[0]) => bill.status === 'overdue' || (bill.status === 'pending' && getDueTime(bill.dueDate) < today.getTime());
  const sortedBills = [...bills].sort((a, b) => getDueTime(a.dueDate) - getDueTime(b.dueDate));
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
        {b.status !== 'paid' ? (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => markBillPaid(b.id)}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => markBillUnpaid(b.id)}>
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(b.id)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => deleteBill(b.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Bills & Due Dates</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage recurring and one-time bills</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Bill</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Bill</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Bill name</Label>
                <Input placeholder="e.g. Netflix" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input placeholder="0.00" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {BILL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label className="text-foreground">Recurring monthly</Label>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>
              <Button className="w-full mt-2" onClick={handleAdd}>Add Bill</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Bill Dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bill name</Label>
              <Input placeholder="e.g. Netflix" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input placeholder="0.00" type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {BILL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="text-foreground">Recurring monthly</Label>
              <Switch checked={editRecurring} onCheckedChange={setEditRecurring} />
            </div>
            <Button className="w-full mt-2" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {bills.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No bills added yet.</p>
        </div>
      )}
    </div>
  );
}
