import { addMonths, differenceInCalendarMonths, format, isBefore, parseISO } from 'date-fns';
import type { CreditCard, Loan, LoanScheduleEntry } from '@/types/finance';

type LoanScheduleSource = Pick<Loan, 'totalAmount' | 'monthlyPayment' | 'startDate' | 'endDate' | 'dueDay'> & {
  repaymentSchedule?: Partial<LoanScheduleEntry>[];
};

const toIsoDate = (date: Date) => format(date, 'yyyy-MM-dd');

const buildDueDate = (monthDate: Date, dueDay: number) => {
  const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const day = Math.min(Math.max(1, dueDay), new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate());
  date.setDate(day);
  return date;
};

const parseValidDate = (value: string) => {
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sortScheduleEntries = (entries: LoanScheduleEntry[]) =>
  [...entries].sort((left, right) => {
    const leftDate = parseValidDate(left.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    const rightDate = parseValidDate(right.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    return leftDate - rightDate;
  });

const normalizeScheduleEntry = (entry: Partial<LoanScheduleEntry>, fallbackId: number): LoanScheduleEntry | null => {
  if (typeof entry.dueDate !== 'string') return null;
  const dueDate = parseValidDate(entry.dueDate);
  if (!dueDate) return null;

  const amount = typeof entry.amount === 'number' ? entry.amount : Number(entry.amount);
  const paidAmount = typeof entry.paidAmount === 'number' ? entry.paidAmount : Number(entry.paidAmount);
  const normalizedAmount = Math.max(0, amount || 0);

  return {
    id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : `loan-schedule-${fallbackId + 1}`,
    dueDate: toIsoDate(dueDate),
    amount: normalizedAmount,
    paidAmount: Math.min(normalizedAmount, Math.max(0, paidAmount || 0)),
  };
};

const getLegacyLoanTermMonths = (loan: Pick<Loan, 'startDate' | 'endDate'>) => {
  const startDate = parseValidDate(loan.startDate);
  const endDate = parseValidDate(loan.endDate);
  if (!startDate || !endDate) return 1;

  return Math.max(1, differenceInCalendarMonths(endDate, startDate));
};

const buildLegacyLoanRepaymentSchedule = (loan: LoanScheduleSource) => {
  const startDate = parseValidDate(loan.startDate);
  const endDate = parseValidDate(loan.endDate);
  if (!startDate || !endDate) return [];

  const monthlyPayment = Math.max(0, loan.monthlyPayment || 0);
  if (monthlyPayment <= 0) return [];

  const dueDay = Math.min(31, Math.max(1, loan.dueDay || startDate.getDate()));
  const months = getLegacyLoanTermMonths(loan);
  const entries: LoanScheduleEntry[] = [];

  for (let offset = 1; offset <= months; offset += 1) {
    const candidate = buildDueDate(addMonths(startDate, offset), dueDay);
    if (candidate < startDate) continue;
    if (candidate > endDate) break;
    entries.push({
      id: `loan-schedule-${offset}`,
      dueDate: toIsoDate(candidate),
      amount: monthlyPayment,
      paidAmount: 0,
    });
  }

  if (entries.length === 0) {
    entries.push({
      id: 'loan-schedule-1',
      dueDate: toIsoDate(endDate),
      amount: monthlyPayment,
      paidAmount: 0,
    });
  }

  return entries;
};

const getNormalizedSchedule = (loan: LoanScheduleSource) => {
  const schedule = Array.isArray(loan.repaymentSchedule) ? loan.repaymentSchedule : [];
  const normalizedSchedule = schedule
    .map((entry, index) => normalizeScheduleEntry(entry, index))
    .filter((entry): entry is LoanScheduleEntry => Boolean(entry));

  const sourceSchedule = normalizedSchedule.length > 0 ? normalizedSchedule : buildLegacyLoanRepaymentSchedule(loan);
  return sortScheduleEntries(sourceSchedule);
};

const getLoanScheduleMonths = (loan: LoanScheduleSource) => {
  const schedule = getNormalizedSchedule(loan);
  if (schedule.length > 0) return schedule.length;
  return getLegacyLoanTermMonths(loan);
};

export const getLoanRepaymentSchedule = (loan: LoanScheduleSource) => getNormalizedSchedule(loan);

export const applyLoanPaymentToSchedule = (schedule: LoanScheduleEntry[], paymentAmount: number) => {
  let remaining = Math.max(0, paymentAmount);
  const updatedSchedule = sortScheduleEntries(schedule).map((entry) => {
    if (remaining <= 0) {
      return entry;
    }

    const available = Math.max(0, entry.amount - entry.paidAmount);
    if (available <= 0) {
      return entry;
    }

    const applied = Math.min(available, remaining);
    remaining -= applied;

    return {
      ...entry,
      paidAmount: entry.paidAmount + applied,
    };
  });

  return {
    schedule: updatedSchedule,
    appliedAmount: Math.max(0, paymentAmount - remaining),
    remainingAmount: remaining,
  };
};

const getLoanScheduledTotal = (loan: LoanScheduleSource) => {
  const schedule = getNormalizedSchedule(loan);
  if (schedule.length > 0) {
    return schedule.reduce((sum, entry) => sum + entry.amount, 0);
  }

  const termMonths = getLegacyLoanTermMonths(loan);
  return Math.max(0, loan.monthlyPayment || 0) * termMonths;
};

export const deriveLoanMonthlyInterestRate = (loan: LoanScheduleSource) => {
  const principal = Math.max(0, loan.totalAmount);
  const totalPayable = getLoanScheduledTotal(loan);
  const termMonths = getLoanScheduleMonths(loan);

  if (principal <= 0 || totalPayable <= principal) return 0;

  return (((totalPayable - principal) / principal) / termMonths) * 100;
};

export const getLoanTotalWithInterest = (loan: LoanScheduleSource) => {
  const totalPayable = getLoanScheduledTotal(loan);
  return totalPayable > 0 ? totalPayable : loan.totalAmount;
};

export const getLoanNextDueEntry = (loan: LoanScheduleSource, referenceDate = new Date()) => {
  const schedule = getNormalizedSchedule(loan);
  if (schedule.length > 0) {
    return schedule.find((entry) => entry.paidAmount < entry.amount) ?? null;
  }

  const startDate = parseValidDate(loan.startDate);
  const endDate = parseValidDate(loan.endDate);
  if (!startDate || !endDate) return null;

  const reference = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const earliestRelevant = isBefore(reference, startDate) ? startDate : reference;
  const monthSeed = new Date(earliestRelevant.getFullYear(), earliestRelevant.getMonth(), 1);

  for (let offset = 0; offset < 240; offset += 1) {
    const candidate = buildDueDate(addMonths(monthSeed, offset), loan.dueDay || 1);
    if (candidate < startDate) continue;
    if (candidate < earliestRelevant) continue;
    if (candidate <= endDate) {
      return {
        id: 'loan-next-due',
        dueDate: toIsoDate(candidate),
        amount: Math.max(0, loan.monthlyPayment || 0),
        paidAmount: 0,
      };
    }
    return {
      id: 'loan-next-due',
      dueDate: toIsoDate(endDate),
      amount: Math.max(0, loan.monthlyPayment || 0),
      paidAmount: 0,
    };
  }

  return {
    id: 'loan-next-due',
    dueDate: toIsoDate(endDate),
    amount: Math.max(0, loan.monthlyPayment || 0),
    paidAmount: 0,
  };
};

export const getLoanNextDueDate = (loan: LoanScheduleSource, referenceDate = new Date()) => {
  const nextDue = getLoanNextDueEntry(loan, referenceDate);
  return nextDue ? parseValidDate(nextDue.dueDate) : null;
};

export const getLoanNextDueAmount = (loan: LoanScheduleSource, referenceDate = new Date()) => {
  const nextDue = getLoanNextDueEntry(loan, referenceDate);
  if (!nextDue) return 0;
  return Math.max(0, nextDue.amount - nextDue.paidAmount);
};

export const getCreditCardTotalWithInterest = (card: CreditCard) =>
  card.paidAmount + card.currentBalance * (1 + card.monthlyInterestRate / 100);
