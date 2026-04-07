import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Trash2, CreditCard, Pencil, PhilippinePeso, TrendingDown, CalendarClock, Percent } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { deriveLoanMonthlyInterestRate, getLoanNextDueAmount, getLoanNextDueDate, getLoanTotalWithInterest } from '@/lib/interest';
import { toast } from 'sonner';

type LoanScheduleFormRow = {
  id: string;
  dueDate: string;
  amount: string;
  paidAmount: string;
};

const createScheduleRow = (overrides: Partial<LoanScheduleFormRow> = {}): LoanScheduleFormRow => ({
  id: Math.random().toString(36).slice(2, 10),
  dueDate: '',
  amount: '',
  paidAmount: '0',
  ...overrides,
});

const normalizeScheduleRows = (rows: LoanScheduleFormRow[]) =>
  rows
    .filter((row) => row.dueDate && Number(row.amount) > 0)
    .map((row) => ({
      id: row.id,
      dueDate: row.dueDate,
      amount: parseFloat(row.amount) || 0,
      paidAmount: parseFloat(row.paidAmount) || 0,
    }))
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

const getScheduleMetadata = (rows: LoanScheduleFormRow[]) => {
  const repaymentSchedule = normalizeScheduleRows(rows);
  const totalAmount = repaymentSchedule.reduce((sum, row) => sum + row.amount, 0);
  const startDate = repaymentSchedule[0]?.dueDate ?? '';
  const endDate = repaymentSchedule[repaymentSchedule.length - 1]?.dueDate ?? '';
  const dueDay = startDate ? new Date(`${startDate}T00:00:00`).getDate() : 1;
  const monthlyPayment = repaymentSchedule.length > 0 ? totalAmount / repaymentSchedule.length : 0;

  return {
    repaymentSchedule,
    totalAmount,
    startDate,
    endDate,
    dueDay,
    monthlyPayment,
  };
};

const parseDateInput = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);

const buildEqualMonthlyRows = (
  startDate: string,
  endDate: string,
  monthlyPayment: string,
  existingRows: LoanScheduleFormRow[] = [],
) => {
  const parsedStartDate = parseDateInput(startDate);
  const parsedEndDate = parseDateInput(endDate);
  const amount = parseFloat(monthlyPayment) || 0;

  if (!parsedStartDate || !parsedEndDate || parsedStartDate > parsedEndDate || amount <= 0) return [];

  const normalizedExisting = normalizeScheduleRows(existingRows);
  const paidByDate = new Map(normalizedExisting.map((row) => [row.dueDate, row.paidAmount]));
  const idByDate = new Map(existingRows.map((row) => [row.dueDate, row.id]));
  const scheduleRows: LoanScheduleFormRow[] = [];
  const dueDay = parsedStartDate.getDate();
  let cursor = new Date(parsedStartDate.getTime());

  for (let index = 0; index < 600 && cursor <= parsedEndDate; index += 1) {
    const dueDate = formatDateInput(cursor);
    const existingPaid = paidByDate.get(dueDate) ?? 0;
    scheduleRows.push(
      createScheduleRow({
        id: idByDate.get(dueDate) ?? undefined,
        dueDate,
        amount: String(amount),
        paidAmount: String(Math.min(amount, Math.max(0, existingPaid))),
      }),
    );

    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    cursor = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(dueDay, lastDay));
  }

  return scheduleRows;
};

export default function LoansPage() {
  const { loans, addLoan, updateLoan, deleteLoan, logLoanPayment, currency } = useFinanceStore();
  const [showAdd, setShowAdd] = useState(false);
  const [payLoanId, setPayLoanId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('0');
  const [payNote, setPayNote] = useState('');

  // Add form
  const [name, setName] = useState('');
  const [total, setTotal] = useState('0');
  const [paid, setPaid] = useState('0');
  const [scheduleRows, setScheduleRows] = useState<LoanScheduleFormRow[]>([createScheduleRow()]);
  const [loanType, setLoanType] = useState<'loan' | 'installment'>('loan');
  const [sameMonthlyPayment, setSameMonthlyPayment] = useState(true);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleMonthlyPayment, setScheduleMonthlyPayment] = useState('');

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTotal, setEditTotal] = useState('0');
  const [editPaid, setEditPaid] = useState('0');
  const [editScheduleRows, setEditScheduleRows] = useState<LoanScheduleFormRow[]>([createScheduleRow()]);
  const [editType, setEditType] = useState<'loan' | 'installment'>('loan');
  const [editSameMonthlyPayment, setEditSameMonthlyPayment] = useState(true);
  const [editScheduleStartDate, setEditScheduleStartDate] = useState('');
  const [editScheduleEndDate, setEditScheduleEndDate] = useState('');
  const [editScheduleMonthlyPayment, setEditScheduleMonthlyPayment] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [addErrors, setAddErrors] = useState<{ name?: string; total?: string; schedule?: string }>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; total?: string; schedule?: string }>({});
  const [payError, setPayError] = useState<string | null>(null);

  const addGeneratedRows = buildEqualMonthlyRows(
    scheduleStartDate,
    scheduleEndDate,
    scheduleMonthlyPayment,
    scheduleRows,
  );
  const editGeneratedRows = buildEqualMonthlyRows(
    editScheduleStartDate,
    editScheduleEndDate,
    editScheduleMonthlyPayment,
    editScheduleRows,
  );
  const addSourceRows = sameMonthlyPayment ? addGeneratedRows : scheduleRows;
  const editSourceRows = editSameMonthlyPayment ? editGeneratedRows : editScheduleRows;

  const handleAdd = () => {
    setAddErrors({});
    const errors: typeof addErrors = {};
    if (!name) errors.name = 'Name is required';
    if (!(parseFloat(total) > 0)) errors.total = 'Total amount must be greater than 0';
    const scheduleMetadata = getScheduleMetadata(addSourceRows);
    if (scheduleMetadata.repaymentSchedule.length === 0) errors.schedule = 'Repayment schedule must have at least one row';
    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    const monthlyInterestRate = deriveLoanMonthlyInterestRate({
      totalAmount: parseFloat(total) || 0,
      monthlyPayment: scheduleMetadata.monthlyPayment,
      startDate: scheduleMetadata.startDate,
      endDate: scheduleMetadata.endDate,
      dueDay: scheduleMetadata.dueDay,
      repaymentSchedule: scheduleMetadata.repaymentSchedule,
    });
    addLoan({
      name,
      totalAmount: parseFloat(total),
      paidAmount: parseFloat(paid) || 0,
      monthlyPayment: scheduleMetadata.monthlyPayment,
      monthlyInterestRate,
      startDate: scheduleMetadata.startDate,
      dueDay: scheduleMetadata.dueDay,
      endDate: scheduleMetadata.endDate,
      repaymentSchedule: scheduleMetadata.repaymentSchedule,
      type: loanType,
    });
    setName('');
    setTotal('0');
    setPaid('0');
    setScheduleRows([createScheduleRow()]);
    setSameMonthlyPayment(true);
    setScheduleStartDate('');
    setScheduleEndDate('');
    setScheduleMonthlyPayment('');
    setShowAdd(false);
    toast('Loan created');
  };

  const openEdit = (id: string) => {
    const l = loans.find(x => x.id === id);
    if (!l) return;
    setEditId(id);
    setEditName(l.name);
    setEditTotal(String(l.totalAmount));
    setEditPaid(String(l.paidAmount));
    setEditScheduleRows(
      l.repaymentSchedule.length > 0
        ? l.repaymentSchedule.map((row) => ({
            id: row.id,
            dueDate: row.dueDate,
            amount: String(row.amount),
            paidAmount: String(row.paidAmount),
          }))
        : [createScheduleRow()],
    );
    setEditType(l.type);
    setEditSameMonthlyPayment(true);
    setEditScheduleStartDate(l.startDate || '');
    setEditScheduleEndDate(l.endDate || '');
    setEditScheduleMonthlyPayment(l.monthlyPayment > 0 ? String(l.monthlyPayment) : '');
  };

  const handleEdit = () => {
    setEditErrors({});
    const errors: typeof editErrors = {};
    if (!editId) return;
    if (!editName) errors.name = 'Name is required';
    if (!(parseFloat(editTotal) > 0)) errors.total = 'Total amount must be greater than 0';
    const scheduleMetadata = getScheduleMetadata(editSourceRows);
    if (scheduleMetadata.repaymentSchedule.length === 0) errors.schedule = 'Repayment schedule must have at least one row';
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    const monthlyInterestRate = deriveLoanMonthlyInterestRate({
      totalAmount: parseFloat(editTotal) || 0,
      monthlyPayment: scheduleMetadata.monthlyPayment,
      startDate: scheduleMetadata.startDate,
      endDate: scheduleMetadata.endDate,
      dueDay: scheduleMetadata.dueDay,
      repaymentSchedule: scheduleMetadata.repaymentSchedule,
    });
    updateLoan(editId, {
      name: editName,
      totalAmount: parseFloat(editTotal) || 0,
      paidAmount: parseFloat(editPaid) || 0,
      monthlyPayment: scheduleMetadata.monthlyPayment,
      monthlyInterestRate,
      startDate: scheduleMetadata.startDate,
      dueDay: scheduleMetadata.dueDay,
      endDate: scheduleMetadata.endDate,
      repaymentSchedule: scheduleMetadata.repaymentSchedule,
      type: editType,
    });
    setEditId(null);
    toast('Loan updated');
  };

  const handlePay = () => {
    setPayError(null);
    if (!payLoanId) return;
    const loan = loans.find((item) => item.id === payLoanId);
    if (!loan) return;
    const remaining = Math.max(0, getLoanTotalWithInterest(loan) - loan.paidAmount);
    const requested = parseFloat(payAmount) || 0;
    if (!(requested > 0)) {
      setPayError('Enter an amount greater than 0');
      toast.error('Invalid payment amount');
      return;
    }
    const paymentAmount = Math.min(requested, remaining);
    if (paymentAmount <= 0) {
      setPayError('Payment must be greater than remaining balance');
      toast.error('Payment must be greater than remaining balance');
      return;
    }
    logLoanPayment(payLoanId, paymentAmount, payNote || undefined);
    setPayAmount(''); setPayNote(''); setPayLoanId(null);
    toast('Payment logged');
  };

  const handleDeleteLoan = (loanId: string) => {
    const loan = loans.find((item) => item.id === loanId);
    if (!loan) return;
    setPendingDelete({ id: loanId, label: loan.name });
  };

  const confirmDeleteLoan = () => {
    if (!pendingDelete) return;
    deleteLoan(pendingDelete.id);
    setPendingDelete(null);
  };

  const activeLoans = loans.filter((l) => l.type === 'loan');
  const installments = loans.filter((l) => l.type === 'installment');
  const getLoanProgressPct = (loan: (typeof loans)[number]) => {
    const totalWithInterest = getLoanTotalWithInterest(loan);
    return totalWithInterest > 0 ? Math.min(100, Math.round((loan.paidAmount / totalWithInterest) * 100)) : 0;
  };
  const totalOutstanding = loans.reduce((sum, loan) => sum + Math.max(0, getLoanTotalWithInterest(loan) - loan.paidAmount), 0);
  const totalMonthly = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  const averageInterest = loans.length > 0 ? loans.reduce((sum, loan) => sum + loan.monthlyInterestRate, 0) / loans.length : 0;
  const totalLoanCount = loans.length;
  const addScheduleMetadata = getScheduleMetadata(addSourceRows);
  const editScheduleMetadata = getScheduleMetadata(editSourceRows);
  const addMonthlyInterestRate = deriveLoanMonthlyInterestRate({
    totalAmount: parseFloat(total) || 0,
    monthlyPayment: addScheduleMetadata.monthlyPayment,
    startDate: addScheduleMetadata.startDate,
    endDate: addScheduleMetadata.endDate,
    dueDay: addScheduleMetadata.dueDay,
    repaymentSchedule: addScheduleMetadata.repaymentSchedule,
  });
  const editMonthlyInterestRate = deriveLoanMonthlyInterestRate({
    totalAmount: parseFloat(editTotal) || 0,
    monthlyPayment: editScheduleMetadata.monthlyPayment,
    startDate: editScheduleMetadata.startDate,
    endDate: editScheduleMetadata.endDate,
    dueDay: editScheduleMetadata.dueDay,
    repaymentSchedule: editScheduleMetadata.repaymentSchedule,
  });
  const formatMonthlyInterestRate = (value: number) => `${value.toFixed(2)}%`;
  const formatMonthDay = (value: Date | null) =>
    value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value) : 'Completed';
  const renderScheduleEditor = (
    title: string,
    rows: LoanScheduleFormRow[],
    setRows: Dispatch<SetStateAction<LoanScheduleFormRow[]>>,
  ) => {
    const normalizedRows = normalizeScheduleRows(rows);
    const totalDue = normalizedRows.reduce((sum, row) => sum + row.amount, 0);
    const averageAmount = normalizedRows.length > 0 ? totalDue / normalizedRows.length : 0;

    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label>{title}</Label>
            <p className="text-xs text-muted-foreground">Add one row per due month with its own amount.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows((current) => [...current, createScheduleRow()])}
          >
            Add row
          </Button>
        </div>
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label>Due date {index + 1}</Label>
                <Input
                  type="date"
                  value={row.dueDate}
                  onChange={(e) =>
                    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, dueDate: e.target.value } : item)))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input
                  placeholder="0.00"
                  type="number"
                  value={row.amount}
                  onChange={(e) =>
                    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, amount: e.target.value } : item)))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground"
                  disabled={(parseFloat(row.paidAmount) || 0) > 0}
                  title={(parseFloat(row.paidAmount) || 0) > 0 ? 'Paid rows cannot be removed' : 'Remove row'}
                  onClick={() => setRows((current) => (current.length > 1 ? current.filter((item) => item.id !== row.id) : current))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Total due: {currency}{totalDue.toLocaleString()}</div>
          <div>Average payment: {currency}{averageAmount.toLocaleString()}</div>
        </div>
      </div>
    );
  };

  const renderLoanCard = (l: typeof loans[0]) => {
    const totalWithInterest = getLoanTotalWithInterest(l);
    const pct = getLoanProgressPct(l);
    const remaining = Math.max(0, totalWithInterest - l.paidAmount);
    const nextDue = getLoanNextDueDate(l);
    const nextDueAmount = getLoanNextDueAmount(l);
    const formattedNextDue = formatMonthDay(nextDue);
    const formattedNextDueAmount = nextDue ? `${currency}${nextDueAmount.toLocaleString()}` : '—';

    return (
      <div key={l.id} className="glass-card rounded-xl p-5 animate-fade-in">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-heading font-semibold text-foreground">{l.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {l.type} {l.monthlyInterestRate > 0 && `· ${formatMonthlyInterestRate(l.monthlyInterestRate)} monthly`}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setPayLoanId(l.id)}>
              <CreditCard className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(l.id)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleDeleteLoan(l.id)}>
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
            <span>{currency}{totalWithInterest.toLocaleString()} total with interest</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Remaining</span>
            <p className="font-medium text-foreground">{currency}{remaining.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground">Next Amount</span>
            <p className="font-medium text-foreground">{formattedNextDueAmount}</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Next Due</span>
            <p className="font-medium text-foreground">{formattedNextDue}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loans & Installments"
        description="Track your loans and log payments"
        actions={
        <Dialog
          open={showAdd}
          onOpenChange={(open) => {
            setShowAdd(open);
            if (open) {
              setName('');
              setTotal('0');
              setPaid('0');
              setScheduleRows([createScheduleRow()]);
              setLoanType('loan');
              setSameMonthlyPayment(true);
              setScheduleStartDate('');
              setScheduleEndDate('');
              setScheduleMonthlyPayment('');
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Loan/Installment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Loan / Installment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. Car Loan" value={name} onChange={(e) => setName(e.target.value)} />
                {addErrors.name ? <p className="text-sm text-destructive">{addErrors.name}</p> : null}
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
              <Label>Total amount (without interest)</Label>
              <Input placeholder="0.00" type="number" value={total} onChange={(e) => setTotal(e.target.value)} />
              {addErrors.total ? <p className="text-sm text-destructive">{addErrors.total}</p> : null}
            </div>
              <div className="space-y-1.5">
                <Label>Paid amount</Label>
                <Input placeholder="0.00" type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Same monthly payment</Label>
                    <p className="text-xs text-muted-foreground">Default is same monthly payment. Turn this off to enter a detailed repayment schedule.</p>
                  </div>
                  <Switch checked={sameMonthlyPayment} onCheckedChange={setSameMonthlyPayment} />
                </div>
              </div>
              {sameMonthlyPayment ? (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <Label>Monthly payment plan</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                          <Label>Start date</Label>
                          <Input type="date" value={scheduleStartDate} onChange={(e) => setScheduleStartDate(e.target.value)} />
                        </div>
                    <div className="space-y-1.5">
                      <Label>End date</Label>
                      <Input type="date" value={scheduleEndDate} onChange={(e) => setScheduleEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monthly payment</Label>
                    <Input
                      placeholder="0.00"
                      type="number"
                      value={scheduleMonthlyPayment}
                      onChange={(e) => setScheduleMonthlyPayment(e.target.value)}
                    />
                    {addErrors.schedule ? <p className="text-sm text-destructive">{addErrors.schedule}</p> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generated {addGeneratedRows.length} payment{addGeneratedRows.length === 1 ? '' : 's'} at {currency}
                    {(parseFloat(scheduleMonthlyPayment) || 0).toLocaleString()} each.
                  </p>
                </div>
              ) : (
                renderScheduleEditor('Repayment schedule', scheduleRows, setScheduleRows)
              )}
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                <Label>Effective monthly interest rate</Label>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {addMonthlyInterestRate > 0 ? `${addMonthlyInterestRate.toFixed(2)}%` : 'Auto-calculated after you add repayment rows'}
                </p>
              </div>
              <Button className="w-full mt-2" onClick={handleAdd}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Loans"
          value={String(totalLoanCount)}
          subtitle={`${activeLoans.length} active, ${installments.length} installment${installments.length === 1 ? '' : 's'}`}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          title="Outstanding Balance"
          value={`${currency}${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Across all loans"
          icon={<PhilippinePeso className="h-5 w-5" />}
        />
        <StatCard
          title="Monthly Commitments"
          value={`${currency}${totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Planned monthly payments"
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          title="Average monthly rate"
          value={`${averageInterest.toFixed(1)}%`}
          subtitle="Across all loans"
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!payLoanId} onOpenChange={() => setPayLoanId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Payment amount</Label>
              <Input placeholder="0.00" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              {payError ? <p className="text-sm text-destructive">{payError}</p> : null}
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
              {editErrors.name ? <p className="text-sm text-destructive">{editErrors.name}</p> : null}
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
              <Label>Total amount (without interest)</Label>
              <Input placeholder="0.00" type="number" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} />
              {editErrors.total ? <p className="text-sm text-destructive">{editErrors.total}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Paid amount</Label>
              <Input placeholder="0.00" type="number" value={editPaid} onChange={(e) => setEditPaid(e.target.value)} />
            </div>
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Same monthly payment</Label>
                  <p className="text-xs text-muted-foreground">Default is same monthly payment. Turn this off to enter a detailed repayment schedule.</p>
                </div>
                <Switch checked={editSameMonthlyPayment} onCheckedChange={setEditSameMonthlyPayment} />
              </div>
            </div>
            {editSameMonthlyPayment ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <Label>Monthly payment plan</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Start date</Label>
                    <Input
                      type="date"
                      value={editScheduleStartDate}
                      onChange={(e) => setEditScheduleStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End date</Label>
                    <Input type="date" value={editScheduleEndDate} onChange={(e) => setEditScheduleEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly payment</Label>
                  <Input
                    placeholder="0.00"
                    type="number"
                    value={editScheduleMonthlyPayment}
                    onChange={(e) => setEditScheduleMonthlyPayment(e.target.value)}
                  />
                  {editErrors.schedule ? <p className="text-sm text-destructive">{editErrors.schedule}</p> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Generated {editGeneratedRows.length} payment{editGeneratedRows.length === 1 ? '' : 's'} at {currency}
                  {(parseFloat(editScheduleMonthlyPayment) || 0).toLocaleString()} each.
                </p>
              </div>
            ) : (
              renderScheduleEditor('Repayment schedule', editScheduleRows, setEditScheduleRows)
            )}
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
              <Label>Effective monthly interest rate</Label>
              <p className="mt-1 text-sm font-medium text-foreground">
                {editMonthlyInterestRate > 0 ? `${editMonthlyInterestRate.toFixed(2)}%` : 'Auto-calculated after you set the repayment schedule'}
              </p>
            </div>
            <Button className="w-full mt-2" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete loan?"
        description={
          pendingDelete ? `Are you sure you want to delete loan "${pendingDelete.label}"? This action cannot be undone.` : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDeleteLoan}
      />

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
