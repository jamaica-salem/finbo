import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, CalendarClock, HandCoins, Pencil, Plus, ReceiptText, Trash2, Wallet } from 'lucide-react';
import { useFinanceStore } from '@/store/financeStore';
import type { PersonalDebt, PersonalDebtDirection } from '@/types/finance';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const todayKey = () => new Date().toISOString().slice(0, 10);

const formatDate = (value?: string) => {
  if (!value) return 'No due date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const formatCurrency = (currency: string, amount: number) =>
  `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getRemaining = (debt: PersonalDebt) => Math.max(0, debt.amount - debt.paidAmount);

export default function DebtsPage() {
  const {
    accounts,
    personalDebts,
    personalDebtPayments,
    addPersonalDebt,
    updatePersonalDebt,
    deletePersonalDebt,
    logPersonalDebtPayment,
    currency,
  } = useFinanceStore();

  const [showAdd, setShowAdd] = useState(false);
  const [direction, setDirection] = useState<PersonalDebtDirection>('iOwe');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [addErrors, setAddErrors] = useState<{ personName?: string; amount?: string }>({});

  const [editId, setEditId] = useState<string | null>(null);
  const [editDirection, setEditDirection] = useState<PersonalDebtDirection>('iOwe');
  const [editPersonName, setEditPersonName] = useState('');
  const [editAmount, setEditAmount] = useState('0');
  const [editPaidAmount, setEditPaidAmount] = useState('0');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editErrors, setEditErrors] = useState<{ personName?: string; amount?: string }>({});

  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentAccountId, setPaymentAccountId] = useState(accounts[0]?.id ?? '');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

  const activeDebts = personalDebts.filter((debt) => debt.status !== 'settled');
  const debtsIOwe = activeDebts.filter((debt) => debt.direction === 'iOwe');
  const debtsOwedToMe = activeDebts.filter((debt) => debt.direction === 'owedToMe');
  const totalIOwe = debtsIOwe.reduce((sum, debt) => sum + getRemaining(debt), 0);
  const totalOwedToMe = debtsOwedToMe.reduce((sum, debt) => sum + getRemaining(debt), 0);
  const settledCount = personalDebts.filter((debt) => debt.status === 'settled').length;
  const netReceivable = totalOwedToMe - totalIOwe;
  const recentPayments = personalDebtPayments.slice(0, 6);

  const resetAddForm = () => {
    setDirection('iOwe');
    setPersonName('');
    setAmount('0');
    setPaidAmount('0');
    setDueDate('');
    setNote('');
    setAddErrors({});
  };

  const handleAdd = () => {
    const errors: typeof addErrors = {};
    const parsedAmount = Math.abs(parseFloat(amount) || 0);
    const parsedPaidAmount = Math.abs(parseFloat(paidAmount) || 0);
    if (!personName.trim()) errors.personName = 'Person name is required';
    if (parsedAmount <= 0) errors.amount = 'Amount must be greater than 0';
    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    addPersonalDebt({
      personName: personName.trim(),
      direction,
      amount: parsedAmount,
      paidAmount: Math.min(parsedPaidAmount, parsedAmount),
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
    });
    resetAddForm();
    setShowAdd(false);
    toast.success('Debt added');
  };

  const openEdit = (debt: PersonalDebt) => {
    setEditId(debt.id);
    setEditDirection(debt.direction);
    setEditPersonName(debt.personName);
    setEditAmount(String(debt.amount));
    setEditPaidAmount(String(debt.paidAmount));
    setEditDueDate(debt.dueDate ?? '');
    setEditNote(debt.note ?? '');
    setEditErrors({});
  };

  const handleEdit = () => {
    if (!editId) return;
    const errors: typeof editErrors = {};
    const parsedAmount = Math.abs(parseFloat(editAmount) || 0);
    const parsedPaidAmount = Math.abs(parseFloat(editPaidAmount) || 0);
    if (!editPersonName.trim()) errors.personName = 'Person name is required';
    if (parsedAmount <= 0) errors.amount = 'Amount must be greater than 0';
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    updatePersonalDebt(editId, {
      personName: editPersonName.trim(),
      direction: editDirection,
      amount: parsedAmount,
      paidAmount: Math.min(parsedPaidAmount, parsedAmount),
      dueDate: editDueDate || undefined,
      note: editNote.trim() || undefined,
    });
    setEditId(null);
    toast.success('Debt updated');
  };

  const handlePayment = () => {
    if (!paymentDebtId) return;
    const debt = personalDebts.find((item) => item.id === paymentDebtId);
    if (!debt) return;
    const requested = Math.abs(parseFloat(paymentAmount) || 0);
    const remaining = getRemaining(debt);
    if (!paymentAccountId) {
      setPaymentError('Choose the account for this payment');
      toast.error('Choose a payment account');
      return;
    }
    if (requested <= 0) {
      setPaymentError('Enter an amount greater than 0');
      toast.error('Invalid payment amount');
      return;
    }
    if (remaining <= 0) {
      setPaymentError('This debt is already settled');
      toast.error('Debt is already settled');
      return;
    }

    logPersonalDebtPayment(paymentDebtId, Math.min(requested, remaining), paymentNote.trim() || undefined, paymentAccountId);
    setPaymentDebtId(null);
    setPaymentAmount('0');
    setPaymentAccountId(accounts[0]?.id ?? '');
    setPaymentNote('');
    setPaymentError(null);
    toast.success('Payment recorded');
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deletePersonalDebt(pendingDelete.id);
    setPendingDelete(null);
    toast.success('Debt deleted');
  };

  const renderDebtCard = (debt: PersonalDebt) => {
    const remaining = getRemaining(debt);
    const progress = debt.amount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100)) : 0;
    const overdue = debt.dueDate ? new Date(`${debt.dueDate}T00:00:00`).getTime() < new Date(`${todayKey()}T00:00:00`).getTime() : false;
    const isIOwe = debt.direction === 'iOwe';

    return (
      <div key={debt.id} className="glass-card rounded-xl p-5 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading font-semibold text-foreground">{debt.personName}</p>
              <Badge variant={isIOwe ? 'destructive' : 'secondary'} className="text-[10px] uppercase tracking-wide">
                {isIOwe ? 'I owe' : 'Owes me'}
              </Badge>
              {overdue ? (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-destructive">
                  Overdue
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{debt.note || 'No note'}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setPaymentDebtId(debt.id)}>
              <ReceiptText className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(debt)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setPendingDelete({ id: debt.id, label: debt.personName })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Settled</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(currency, debt.paidAmount)} paid</span>
            <span>{formatCurrency(currency, debt.amount)} total</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              <span>Remaining</span>
            </div>
            <p className={cn('mt-1 font-medium', isIOwe ? 'text-destructive' : 'text-success')}>
              {formatCurrency(currency, remaining)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Due date</span>
            </div>
            <p className="mt-1 font-medium text-foreground">{formatDate(debt.dueDate)}</p>
          </div>
        </div>
      </div>
    );
  };

  const paymentDebt = paymentDebtId ? personalDebts.find((debt) => debt.id === paymentDebtId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debts"
        description="Track money you owe people and money people owe you."
        actions={
          <Dialog
            open={showAdd}
            onOpenChange={(open) => {
              setShowAdd(open);
              if (open) resetAddForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Add Debt</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Debt</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Direction</Label>
                  <Select value={direction} onValueChange={(value) => setDirection(value as PersonalDebtDirection)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iOwe">I owe this person</SelectItem>
                      <SelectItem value="owedToMe">This person owes me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Person</Label>
                  <Input placeholder="e.g. Ana Cruz" value={personName} onChange={(event) => setPersonName(event.target.value)} />
                  {addErrors.personName ? <p className="text-sm text-destructive">{addErrors.personName}</p> : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Total amount</Label>
                    <Input type="number" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
                    {addErrors.amount ? <p className="text-sm text-destructive">{addErrors.amount}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Already paid</Label>
                    <Input type="number" placeholder="0.00" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Note</Label>
                  <Input placeholder="e.g. Split dinner bill" value={note} onChange={(event) => setNote(event.target.value)} />
                </div>
                <Button className="w-full" onClick={handleAdd}>Create Debt</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="I Owe" value={formatCurrency(currency, totalIOwe)} subtitle={`${debtsIOwe.length} active`} icon={<ArrowUpRight className="h-5 w-5" />} />
        <StatCard title="Owed To Me" value={formatCurrency(currency, totalOwedToMe)} subtitle={`${debtsOwedToMe.length} active`} icon={<ArrowDownLeft className="h-5 w-5" />} />
        <StatCard
          title="Net Debt Position"
          value={formatCurrency(currency, netReceivable)}
          valueClassName={netReceivable < 0 ? 'text-destructive' : netReceivable > 0 ? 'text-success' : undefined}
          subtitle="Owed to me - I owe"
          icon={<HandCoins className="h-5 w-5" />}
        />
        <StatCard title="Settled" value={String(settledCount)} subtitle="Fully paid records" icon={<ReceiptText className="h-5 w-5" />} />
      </div>

      <Dialog open={Boolean(paymentDebtId)} onOpenChange={() => { setPaymentDebtId(null); setPaymentError(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {paymentDebt ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">{paymentDebt.personName}</p>
                <p className="text-muted-foreground">Remaining: {formatCurrency(currency, getRemaining(paymentDebt))}</p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Payment amount</Label>
              <Input type="number" placeholder="0.00" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
              {paymentError ? <p className="text-sm text-destructive">{paymentError}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>{paymentDebt?.direction === 'owedToMe' ? 'Received into' : 'Paid from'}</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId} disabled={!accounts.length}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input placeholder="e.g. Cash payment" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} />
            </div>
            <Button className="w-full" onClick={handlePayment}>Save Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editId)} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Debt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={editDirection} onValueChange={(value) => setEditDirection(value as PersonalDebtDirection)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iOwe">I owe this person</SelectItem>
                  <SelectItem value="owedToMe">This person owes me</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Person</Label>
              <Input value={editPersonName} onChange={(event) => setEditPersonName(event.target.value)} />
              {editErrors.personName ? <p className="text-sm text-destructive">{editErrors.personName}</p> : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Total amount</Label>
                <Input type="number" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} />
                {editErrors.amount ? <p className="text-sm text-destructive">{editErrors.amount}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Paid amount</Label>
                <Input type="number" value={editPaidAmount} onChange={(event) => setEditPaidAmount(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={editNote} onChange={(event) => setEditNote(event.target.value)} />
            </div>
            <Button className="w-full" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete debt?"
        description={pendingDelete ? `Are you sure you want to delete debt record for "${pendingDelete.label}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-foreground">People I Owe</h2>
          {debtsIOwe.length > 0 ? debtsIOwe.map(renderDebtCard) : (
            <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">No active debts you owe.</div>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="font-heading font-semibold text-foreground">People Who Owe Me</h2>
          {debtsOwedToMe.length > 0 ? debtsOwedToMe.map(renderDebtCard) : (
            <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">No active debts owed to you.</div>
          )}
        </section>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h2 className="font-heading font-semibold text-foreground mb-4">Recent Debt Payments</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No debt payments recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {recentPayments.map((payment) => {
              const debt = personalDebts.find((item) => item.id === payment.debtId);
              return (
                <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{debt?.personName ?? 'Deleted debt'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.date)}{payment.note ? ` - ${payment.note}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(currency, payment.amount)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
