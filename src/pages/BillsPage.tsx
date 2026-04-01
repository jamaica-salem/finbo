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

export default function BillsPage() {
  const { bills, addBill, updateBill, deleteBill, markBillPaid, markBillUnpaid, currency } = useFinanceStore();
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [recurring, setRecurring] = useState(true);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editRecurring, setEditRecurring] = useState(true);

  const handleAdd = () => {
    if (!name || !amount || !dueDay) return;
    addBill({ name, amount: parseFloat(amount), category: category || 'Other', dueDay: parseInt(dueDay), recurring, status: 'pending' });
    setName(''); setAmount(''); setCategory(''); setDueDay(''); setShowAdd(false);
  };

  const openEdit = (id: string) => {
    const b = bills.find(x => x.id === id);
    if (!b) return;
    setEditId(id);
    setEditName(b.name);
    setEditAmount(String(b.amount));
    setEditCategory(b.category);
    setEditDueDay(String(b.dueDay));
    setEditRecurring(b.recurring);
  };

  const handleEdit = () => {
    if (!editId || !editName) return;
    updateBill(editId, {
      name: editName,
      amount: parseFloat(editAmount) || 0,
      category: editCategory || 'Other',
      dueDay: parseInt(editDueDay) || 1,
      recurring: editRecurring,
    });
    setEditId(null);
  };

  const today = new Date().getDate();

  const overdue = bills.filter((b) => b.status === 'overdue' || (b.status === 'pending' && b.dueDay < today));
  const pending = bills.filter((b) => b.status === 'pending' && b.dueDay >= today);
  const paid = bills.filter((b) => b.status === 'paid');

  const renderBill = (b: typeof bills[0]) => (
    <div key={b.id} className={cn(
      'flex items-center justify-between py-3 px-4 rounded-lg border',
      b.status === 'overdue' || (b.status === 'pending' && b.dueDay < today)
        ? 'border-destructive/30 bg-destructive/5'
        : b.status === 'paid'
          ? 'border-success/30 bg-success/5'
          : 'border-border bg-card'
    )}>
      <div>
        <p className="text-sm font-medium text-foreground">{b.name}</p>
        <p className="text-xs text-muted-foreground">{b.category} · Due: {b.dueDay}th {b.recurring && '· Recurring'}</p>
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
                <Label>Due day</Label>
                <Input placeholder="e.g. 15" type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
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
              <Label>Due day</Label>
              <Input placeholder="e.g. 15" type="number" min="1" max="31" value={editDueDay} onChange={(e) => setEditDueDay(e.target.value)} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="text-foreground">Recurring monthly</Label>
              <Switch checked={editRecurring} onCheckedChange={setEditRecurring} />
            </div>
            <Button className="w-full mt-2" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {overdue.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-destructive mb-3">⚠ Overdue ({overdue.length})</h2>
          <div className="space-y-2">{overdue.map(renderBill)}</div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-foreground mb-3">Upcoming ({pending.length})</h2>
          <div className="space-y-2">{pending.map(renderBill)}</div>
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-foreground mb-3">Paid ({paid.length})</h2>
          <div className="space-y-2">{paid.map(renderBill)}</div>
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
