import { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, CreditCard, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoansPage() {
  const { loans, addLoan, updateLoan, deleteLoan, logLoanPayment, currency } = useFinanceStore();
  const [showAdd, setShowAdd] = useState(false);
  const [payLoanId, setPayLoanId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  // Add form
  const [name, setName] = useState('');
  const [total, setTotal] = useState('0');
  const [monthly, setMonthly] = useState('0');
  const [interest, setInterest] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loanType, setLoanType] = useState<'loan' | 'installment'>('loan');

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editPaid, setEditPaid] = useState('');
  const [editMonthly, setEditMonthly] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editType, setEditType] = useState<'loan' | 'installment'>('loan');

  const handleAdd = () => {
    if (!name) return;
    addLoan({
      name, totalAmount: parseFloat(total), paidAmount: 0, monthlyPayment: parseFloat(monthly),
      interestRate: parseFloat(interest) || 0, startDate, dueDate, type: loanType,
    });
    setName(''); setTotal('0'); setMonthly('0'); setInterest('0'); setShowAdd(false);
  };

  const openEdit = (id: string) => {
    const l = loans.find(x => x.id === id);
    if (!l) return;
    setEditId(id);
    setEditName(l.name);
    setEditTotal(String(l.totalAmount));
    setEditPaid(String(l.paidAmount));
    setEditMonthly(String(l.monthlyPayment));
    setEditInterest(String(l.interestRate));
    setEditStartDate(l.startDate);
    setEditDueDate(l.dueDate);
    setEditType(l.type);
  };

  const handleEdit = () => {
    if (!editId || !editName) return;
    updateLoan(editId, {
      name: editName,
      totalAmount: parseFloat(editTotal) || 0,
      paidAmount: parseFloat(editPaid) || 0,
      monthlyPayment: parseFloat(editMonthly) || 0,
      interestRate: parseFloat(editInterest) || 0,
      startDate: editStartDate,
      dueDate: editDueDate,
      type: editType,
    });
    setEditId(null);
  };

  const handlePay = () => {
    if (!payLoanId || !payAmount) return;
    logLoanPayment(payLoanId, parseFloat(payAmount), payNote || undefined);
    setPayAmount(''); setPayNote(''); setPayLoanId(null);
  };

  const activeLoans = loans.filter((l) => l.type === 'loan');
  const installments = loans.filter((l) => l.type === 'installment');

  const renderLoanCard = (l: typeof loans[0]) => {
    const pct = Math.min(100, Math.round((l.paidAmount / l.totalAmount) * 100));
    const remaining = l.totalAmount - l.paidAmount;

    let formattedDue = '-';
    if (l.dueDate) {
      const parts = l.dueDate.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(dateObj.getTime())) {
          formattedDue = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateObj);
        }
      }
    }

    return (
      <div key={l.id} className="glass-card rounded-xl p-5 animate-fade-in">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-heading font-semibold text-foreground">{l.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{l.type} {l.interestRate > 0 && `· ${l.interestRate}% APR`}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setPayLoanId(l.id)}>
              <CreditCard className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(l.id)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => deleteLoan(l.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currency}{l.paidAmount.toLocaleString()} paid</span>
            <span>{currency}{l.totalAmount.toLocaleString()} total</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Remaining</span>
            <p className="font-medium text-foreground">{currency}{remaining.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground">Monthly</span>
            <p className="font-medium text-foreground">{currency}{l.monthlyPayment.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Due</span>
            <p className="font-medium text-foreground">{formattedDue}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Loans & Installments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your loans and log payments</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Loan/Installment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Loan / Installment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. Car Loan" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={loanType} onValueChange={(v) => setLoanType(v as 'loan' | 'installment')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="installment">Installment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Total amount</Label>
                <Input placeholder="0.00" type="number" value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly payment</Label>
                <Input placeholder="0.00" type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Interest rate %</Label>
                <Input placeholder="0" type="number" value={interest} onChange={(e) => setInterest(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <Button className="w-full mt-2" onClick={handleAdd}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!payLoanId} onOpenChange={() => setPayLoanId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Payment amount</Label>
              <Input placeholder="0.00" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Extra payment" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
            </div>
            <Button className="w-full mt-2" onClick={handlePay}>Log Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Loan / Installment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Car Loan" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as 'loan' | 'installment')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total amount</Label>
              <Input placeholder="0.00" type="number" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Paid amount</Label>
              <Input placeholder="0.00" type="number" value={editPaid} onChange={(e) => setEditPaid(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly payment</Label>
              <Input placeholder="0.00" type="number" value={editMonthly} onChange={(e) => setEditMonthly(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Interest rate %</Label>
              <Input placeholder="0" type="number" value={editInterest} onChange={(e) => setEditInterest(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <Button className="w-full mt-2" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {activeLoans.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-foreground mb-3">Loans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLoans.map(renderLoanCard)}
          </div>
        </div>
      )}

      {installments.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-foreground mb-3">Installments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installments.map(renderLoanCard)}
          </div>
        </div>
      )}

      {loans.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No loans or installments yet. Add one to start tracking.</p>
        </div>
      )}
    </div>
  );
}
