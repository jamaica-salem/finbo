import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
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
import { applyLoanPaymentToSchedule, deriveLoanMonthlyInterestRate, getLoanNextDueAmount, getLoanNextDueDate, getLoanTotalWithInterest } from '@/lib/interest';
import { toast } from 'sonner';

type LoanScheduleFormRow = {
  id: string;
  dueDate: string;
  amount: string;
  paidAmount: string;
};

type PaidProgressMode = 'amount' | 'months';

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

const applyPaidAmountToScheduleRows = (rows: LoanScheduleFormRow[], paidAmount: number) => {
  const resetSchedule = normalizeScheduleRows(rows).map((row) => ({ ...row, paidAmount: 0 }));
  return applyLoanPaymentToSchedule(resetSchedule, Math.max(0, paidAmount || 0)).schedule;
};

const parseDateInput = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateInput = (value: Date) => format(value, 'yyyy-MM-dd');

const getPaidAmountFromMonths = (rows: LoanScheduleFormRow[], paidMonthsInput: string) => {
  const normalizedRows = normalizeScheduleRows(rows);
  const parsedMonths = Number.parseInt(paidMonthsInput, 10);
  const safeMonths = Number.isFinite(parsedMonths) ? Math.max(0, Math.min(normalizedRows.length, parsedMonths)) : 0;
  const paidAmount = normalizedRows
    .slice(0, safeMonths)
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    paidAmount,
    safeMonths,
    totalMonths: normalizedRows.length,
  };
};

const inferPaidMonthsFromRows = (rows: LoanScheduleFormRow[]) => {
  const normalizedRows = normalizeScheduleRows(rows);
  let paidMonths = 0;

  for (const row of normalizedRows) {
    if (row.paidAmount >= row.amount && row.amount > 0) {
      paidMonths += 1;
      continue;
    }
    break;
  }

  const hasPartialPayment = normalizedRows.some((row, index) => index >= paidMonths && row.paidAmount > 0);

  return {
    paidMonths,
    isExactMonthCount: !hasPartialPayment,
  };
};

const hasUniformMonthlyAmounts = (rows: LoanScheduleFormRow[]) => {
  const normalizedRows = normalizeScheduleRows(rows);
  if (normalizedRows.length <= 1) return true;

  const firstAmount = normalizedRows[0]?.amount ?? 0;
  return normalizedRows.every((row) => Math.abs(row.amount - firstAmount) < 0.0001);
};

const inferLoanDateFromScheduleRows = (rows: LoanScheduleFormRow[], fallbackStartDate: string) => {
  const normalizedRows = normalizeScheduleRows(rows);
  const firstDueDate = normalizedRows[0]?.dueDate ?? fallbackStartDate;
  const parsedFirstDueDate = parseDateInput(firstDueDate);
  if (!parsedFirstDueDate) return fallbackStartDate;

  const previousMonth = new Date(parsedFirstDueDate.getFullYear(), parsedFirstDueDate.getMonth() - 1, 1);
  const inferredDay = Math.min(
    parsedFirstDueDate.getDate(),
    new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0).getDate(),
  );

  return formatDateInput(new Date(previousMonth.getFullYear(), previousMonth.getMonth(), inferredDay));
};

const getLoanPaymentAmountFromMonths = (
  loan: { repaymentSchedule: Array<{ dueDate: string; amount: number; paidAmount: number }> },
  paymentMonthsInput: string,
) => {
  const parsedMonths = Number.parseInt(paymentMonthsInput, 10);
  const unpaidEntries = [...loan.repaymentSchedule]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .filter((entry) => entry.amount > entry.paidAmount);
  const safeMonths = Number.isFinite(parsedMonths) ? Math.max(0, Math.min(unpaidEntries.length, parsedMonths)) : 0;
  const paymentAmount = unpaidEntries
    .slice(0, safeMonths)
    .reduce((sum, entry) => sum + Math.max(0, entry.amount - entry.paidAmount), 0);

  return {
    paymentAmount,
    safeMonths,
    totalMonths: unpaidEntries.length,
  };
};

const buildEqualMonthlyRows = (
  loanDate: string,
  monthsToPay: string,
  monthlyPayment: string,
  existingRows: LoanScheduleFormRow[] = [],
) => {
  const parsedLoanDate = parseDateInput(loanDate);
  const months = Number.parseInt(monthsToPay, 10);
  const amount = parseFloat(monthlyPayment) || 0;

  if (!parsedLoanDate || !Number.isFinite(months) || months <= 0 || amount <= 0) return [];

  const normalizedExisting = normalizeScheduleRows(existingRows);
  const paidByDate = new Map(normalizedExisting.map((row) => [row.dueDate, row.paidAmount]));
  const idByDate = new Map(existingRows.map((row) => [row.dueDate, row.id]));
  const scheduleRows: LoanScheduleFormRow[] = [];
  const dueDay = parsedLoanDate.getDate();
  const firstDueMonth = new Date(parsedLoanDate.getFullYear(), parsedLoanDate.getMonth() + 1, 1);
  const firstDueMonthLastDay = new Date(firstDueMonth.getFullYear(), firstDueMonth.getMonth() + 1, 0).getDate();
  let cursor = new Date(firstDueMonth.getFullYear(), firstDueMonth.getMonth(), Math.min(dueDay, firstDueMonthLastDay));

  for (let index = 0; index < Math.min(600, months); index += 1) {
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
  const [payMode, setPayMode] = useState<PaidProgressMode>('amount');
  const [payAmount, setPayAmount] = useState('0');
  const [payMonths, setPayMonths] = useState('1');
  const [payNote, setPayNote] = useState('');

  // Add form
  const [name, setName] = useState('');
  const [total, setTotal] = useState('0');
  const [paidMode, setPaidMode] = useState<PaidProgressMode>('amount');
  const [paid, setPaid] = useState('0');
  const [paidMonths, setPaidMonths] = useState('0');
  const [scheduleRows, setScheduleRows] = useState<LoanScheduleFormRow[]>([createScheduleRow()]);
  const [loanType, setLoanType] = useState<'loan' | 'installment'>('loan');
  const [sameMonthlyPayment, setSameMonthlyPayment] = useState(true);
  const [scheduleLoanDate, setScheduleLoanDate] = useState('');
  const [scheduleMonthsToPay, setScheduleMonthsToPay] = useState('');
  const [scheduleMonthlyPayment, setScheduleMonthlyPayment] = useState('');

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTotal, setEditTotal] = useState('0');
  const [editPaidMode, setEditPaidMode] = useState<PaidProgressMode>('amount');
  const [editPaid, setEditPaid] = useState('0');
  const [editPaidMonths, setEditPaidMonths] = useState('0');
  const [editScheduleRows, setEditScheduleRows] = useState<LoanScheduleFormRow[]>([createScheduleRow()]);
  const [editType, setEditType] = useState<'loan' | 'installment'>('loan');
  const [editSameMonthlyPayment, setEditSameMonthlyPayment] = useState(true);
  const [editScheduleLoanDate, setEditScheduleLoanDate] = useState('');
  const [editScheduleMonthsToPay, setEditScheduleMonthsToPay] = useState('');
  const [editScheduleMonthlyPayment, setEditScheduleMonthlyPayment] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [addErrors, setAddErrors] = useState<{ name?: string; total?: string; schedule?: string; loanDate?: string; monthsToPay?: string }>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; total?: string; schedule?: string; loanDate?: string; monthsToPay?: string }>({});
  const [payError, setPayError] = useState<string | null>(null);

  const addGeneratedRows = buildEqualMonthlyRows(
    scheduleLoanDate,
    scheduleMonthsToPay,
    scheduleMonthlyPayment,
    scheduleRows,
  );
  const editGeneratedRows = buildEqualMonthlyRows(
    editScheduleLoanDate,
    editScheduleMonthsToPay,
    editScheduleMonthlyPayment,
    editScheduleRows,
  );
  const addSourceRows = sameMonthlyPayment ? addGeneratedRows : scheduleRows;
  const editSourceRows = editSameMonthlyPayment ? editGeneratedRows : editScheduleRows;
  const addPaidMonthsSummary = getPaidAmountFromMonths(addSourceRows, paidMonths);
  const editPaidMonthsSummary = getPaidAmountFromMonths(editSourceRows, editPaidMonths);

  const handleAdd = () => {
    setAddErrors({});
    const errors: typeof addErrors = {};
    if (!name) errors.name = 'Name is required';
    if (!(parseFloat(total) > 0)) errors.total = 'Total amount must be greater than 0';
    if (sameMonthlyPayment && !scheduleLoanDate) errors.loanDate = 'Date loaned is required';
    if (sameMonthlyPayment && !(Number.parseInt(scheduleMonthsToPay, 10) > 0)) errors.monthsToPay = 'Months to pay must be greater than 0';
    const scheduleMetadata = getScheduleMetadata(addSourceRows);
    if (scheduleMetadata.repaymentSchedule.length === 0) errors.schedule = 'Repayment schedule must have at least one row';
    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    const paidAmount = paidMode === 'months'
      ? addPaidMonthsSummary.paidAmount
      : parseFloat(paid) || 0;
    const repaymentSchedule = applyPaidAmountToScheduleRows(addSourceRows, paidAmount);
    const monthlyInterestRate = deriveLoanMonthlyInterestRate({
      totalAmount: parseFloat(total) || 0,
      monthlyPayment: scheduleMetadata.monthlyPayment,
      startDate: scheduleMetadata.startDate,
      endDate: scheduleMetadata.endDate,
      dueDay: scheduleMetadata.dueDay,
      repaymentSchedule,
    });
    addLoan({
      name,
      totalAmount: parseFloat(total),
      paidAmount,
      monthlyPayment: scheduleMetadata.monthlyPayment,
      monthlyInterestRate,
      startDate: scheduleMetadata.startDate,
      dueDay: scheduleMetadata.dueDay,
      endDate: scheduleMetadata.endDate,
      repaymentSchedule,
      type: loanType,
    });
    setName('');
    setTotal('0');
    setPaidMode('amount');
    setPaid('0');
    setPaidMonths('0');
    setScheduleRows([createScheduleRow()]);
    setSameMonthlyPayment(true);
    setScheduleLoanDate('');
    setScheduleMonthsToPay('');
    setScheduleMonthlyPayment('');
    setShowAdd(false);
    toast('Loan created');
  };

  const openEdit = (id: string) => {
    const l = loans.find(x => x.id === id);
    if (!l) return;
    const editRows =
      l.repaymentSchedule.length > 0
        ? l.repaymentSchedule.map((row) => ({
            id: row.id,
            dueDate: row.dueDate,
            amount: String(row.amount),
            paidAmount: String(row.paidAmount),
          }))
        : [createScheduleRow()];
    const usesUniformMonthlyPayments = hasUniformMonthlyAmounts(editRows);

    setEditId(id);
    setEditName(l.name);
    setEditTotal(String(l.totalAmount));
    setEditPaid(String(l.paidAmount));
    setEditScheduleRows(editRows);
    setEditType(l.type);
    setEditSameMonthlyPayment(usesUniformMonthlyPayments);
    setEditScheduleLoanDate(inferLoanDateFromScheduleRows(editRows, l.startDate || ''));
    setEditScheduleMonthsToPay(String(Math.max(0, l.repaymentSchedule.length || editRows.length)));
    setEditScheduleMonthlyPayment(l.monthlyPayment > 0 ? String(l.monthlyPayment) : '');
    const paidMonthsSummary = inferPaidMonthsFromRows(
      l.repaymentSchedule.length > 0
        ? l.repaymentSchedule.map((row) => ({
            id: row.id,
            dueDate: row.dueDate,
            amount: String(row.amount),
            paidAmount: String(row.paidAmount),
          }))
        : [],
    );
    setEditPaidMonths(String(paidMonthsSummary.paidMonths));
    setEditPaidMode(paidMonthsSummary.isExactMonthCount ? 'months' : 'amount');
  };

  const handleEdit = () => {
    setEditErrors({});
    const errors: typeof editErrors = {};
    if (!editId) return;
    if (!editName) errors.name = 'Name is required';
    if (!(parseFloat(editTotal) > 0)) errors.total = 'Total amount must be greater than 0';
    if (editSameMonthlyPayment && !editScheduleLoanDate) errors.loanDate = 'Date loaned is required';
    if (editSameMonthlyPayment && !(Number.parseInt(editScheduleMonthsToPay, 10) > 0)) errors.monthsToPay = 'Months to pay must be greater than 0';
    const scheduleMetadata = getScheduleMetadata(editSourceRows);
    if (scheduleMetadata.repaymentSchedule.length === 0) errors.schedule = 'Repayment schedule must have at least one row';
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    const paidAmount = editPaidMode === 'months'
      ? editPaidMonthsSummary.paidAmount
      : parseFloat(editPaid) || 0;
    const repaymentSchedule = applyPaidAmountToScheduleRows(editSourceRows, paidAmount);
    const monthlyInterestRate = deriveLoanMonthlyInterestRate({
      totalAmount: parseFloat(editTotal) || 0,
      monthlyPayment: scheduleMetadata.monthlyPayment,
      startDate: scheduleMetadata.startDate,
      endDate: scheduleMetadata.endDate,
      dueDay: scheduleMetadata.dueDay,
      repaymentSchedule,
    });
    updateLoan(editId, {
      name: editName,
      totalAmount: parseFloat(editTotal) || 0,
      paidAmount,
      monthlyPayment: scheduleMetadata.monthlyPayment,
      monthlyInterestRate,
      startDate: scheduleMetadata.startDate,
      dueDay: scheduleMetadata.dueDay,
      endDate: scheduleMetadata.endDate,
      repaymentSchedule,
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
    const requested = payMode === 'months'
      ? payMonthsSummary.paymentAmount
      : parseFloat(payAmount) || 0;
    if (!(requested > 0)) {
      setPayError(payMode === 'months' ? 'Enter paid months greater than 0' : 'Enter an amount greater than 0');
      toast.error(payMode === 'months' ? 'Invalid paid months' : 'Invalid payment amount');
      return;
    }
    const paymentAmount = Math.min(requested, remaining);
    if (paymentAmount <= 0) {
      setPayError('Payment must be greater than remaining balance');
      toast.error('Payment must be greater than remaining balance');
      return;
    }
    logLoanPayment(payLoanId, paymentAmount, payNote || undefined);
    setPayMode('amount'); setPayAmount('0'); setPayMonths('1'); setPayNote(''); setPayLoanId(null);
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

  const isLoanActive = (loan: (typeof loans)[number]) => getLoanTotalWithInterest(loan) - loan.paidAmount > 0.01;
  const activeLoanItems = loans.filter(isLoanActive);
  const activeLoans = activeLoanItems.filter((l) => l.type === 'loan');
  const installments = activeLoanItems.filter((l) => l.type === 'installment');
  const getLoanProgressPct = (loan: (typeof loans)[number]) => {
    const totalWithInterest = getLoanTotalWithInterest(loan);
    return totalWithInterest > 0 ? Math.min(100, Math.round((loan.paidAmount / totalWithInterest) * 100)) : 0;
  };
  const totalOutstanding = activeLoanItems.reduce((sum, loan) => sum + Math.max(0, getLoanTotalWithInterest(loan) - loan.paidAmount), 0);
  const totalMonthly = activeLoanItems.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  const averageInterest = activeLoanItems.length > 0 ? activeLoanItems.reduce((sum, loan) => sum + loan.monthlyInterestRate, 0) / activeLoanItems.length : 0;
  const totalLoanCount = activeLoanItems.length;
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
    value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value) : 'Completed';
  const payLoan = payLoanId ? loans.find((item) => item.id === payLoanId) ?? null : null;
  const payMonthsSummary = payLoan
    ? getLoanPaymentAmountFromMonths(payLoan, payMonths)
    : { paymentAmount: 0, safeMonths: 0, totalMonths: 0 };
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

  const renderPaidProgressFields = (
    mode: PaidProgressMode,
    setMode: Dispatch<SetStateAction<PaidProgressMode>>,
    paidAmountValue: string,
    setPaidAmountValue: Dispatch<SetStateAction<string>>,
    paidMonthsValue: string,
    setPaidMonthsValue: Dispatch<SetStateAction<string>>,
    summary: { paidAmount: number; safeMonths: number; totalMonths: number },
  ) => (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="space-y-1.5">
        <Label>Progress input</Label>
        <Select value={mode} onValueChange={(value) => setMode(value as PaidProgressMode)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="amount">Paid amount</SelectItem>
            <SelectItem value="months">Paid months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {mode === 'amount' ? (
        <div className="space-y-1.5">
          <Label>Paid amount</Label>
          <Input placeholder="0.00" type="number" value={paidAmountValue} onChange={(e) => setPaidAmountValue(e.target.value)} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Paid months</Label>
          <Input placeholder="0" type="number" min="0" step="1" value={paidMonthsValue} onChange={(e) => setPaidMonthsValue(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Counts fully paid months from the start of the schedule. {summary.safeMonths} of {summary.totalMonths} month{summary.totalMonths === 1 ? '' : 's'} = {currency}{summary.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  );

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
              setPaidMode('amount');
              setPaid('0');
              setPaidMonths('0');
              setScheduleRows([createScheduleRow()]);
              setLoanType('loan');
              setSameMonthlyPayment(true);
              setScheduleLoanDate('');
              setScheduleMonthsToPay('');
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
              {renderPaidProgressFields(
                paidMode,
                setPaidMode,
                paid,
                setPaid,
                paidMonths,
                setPaidMonths,
                addPaidMonthsSummary,
              )}
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
                      <Label>Date loaned</Label>
                      <Input type="date" value={scheduleLoanDate} onChange={(e) => setScheduleLoanDate(e.target.value)} />
                      {addErrors.loanDate ? <p className="text-sm text-destructive">{addErrors.loanDate}</p> : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Months to pay</Label>
                      <Input type="number" min="1" step="1" value={scheduleMonthsToPay} onChange={(e) => setScheduleMonthsToPay(e.target.value)} />
                      {addErrors.monthsToPay ? <p className="text-sm text-destructive">{addErrors.monthsToPay}</p> : null}
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
                    Generated {addGeneratedRows.length} payment{addGeneratedRows.length === 1 ? '' : 's'} from the loan date at {currency}
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
      <Dialog open={!!payLoanId} onOpenChange={() => {
        setPayLoanId(null);
        setPayMode('amount');
        setPayAmount('0');
        setPayMonths('1');
        setPayNote('');
        setPayError(null);
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Payment input</Label>
              <Select value={payMode} onValueChange={(value) => setPayMode(value as PaidProgressMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Payment amount</SelectItem>
                  <SelectItem value="months">Paid months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payMode === 'amount' ? (
              <div className="space-y-1.5">
                <Label>Payment amount</Label>
                <Input placeholder="0.00" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                {payError ? <p className="text-sm text-destructive">{payError}</p> : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Paid months</Label>
                <Input placeholder="1" type="number" min="1" step="1" value={payMonths} onChange={(e) => setPayMonths(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Applies to the next unpaid months in the schedule. {payMonthsSummary.safeMonths} of {payMonthsSummary.totalMonths} month{payMonthsSummary.totalMonths === 1 ? '' : 's'} = {currency}{payMonthsSummary.paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {payError ? <p className="text-sm text-destructive">{payError}</p> : null}
              </div>
            )}
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
            {renderPaidProgressFields(
              editPaidMode,
              setEditPaidMode,
              editPaid,
              setEditPaid,
              editPaidMonths,
              setEditPaidMonths,
              editPaidMonthsSummary,
            )}
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
                    <Label>Date loaned</Label>
                    <Input
                      type="date"
                      value={editScheduleLoanDate}
                      onChange={(e) => setEditScheduleLoanDate(e.target.value)}
                    />
                    {editErrors.loanDate ? <p className="text-sm text-destructive">{editErrors.loanDate}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Months to pay</Label>
                    <Input type="number" min="1" step="1" value={editScheduleMonthsToPay} onChange={(e) => setEditScheduleMonthsToPay(e.target.value)} />
                    {editErrors.monthsToPay ? <p className="text-sm text-destructive">{editErrors.monthsToPay}</p> : null}
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
                  Generated {editGeneratedRows.length} payment{editGeneratedRows.length === 1 ? '' : 's'} from the loan date at {currency}
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

      {activeLoanItems.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No active loans or installments. Add one to start tracking.</p>
        </div>
      )}
    </div>
  );
}
