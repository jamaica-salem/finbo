import { getLoanNextDueEntry } from '@/lib/interest';
import type { Bill, CreditCard, Loan, PersonalDebt } from '@/types/finance';

export type DueItemSource =
  | 'bill'
  | 'loan'
  | 'installment'
  | 'credit-card'
  | 'debt-i-owe'
  | 'debt-owed-to-me';

export interface DueItem {
  id: string;
  sourceId: string;
  sourceType: DueItemSource;
  title: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'overdue';
  detail: string;
}

export interface DueItemPaymentActions {
  logCreditCardPayment: (cardId: string, amount: number, note?: string, accountId?: string) => void;
  logLoanPayment: (loanId: string, amount: number, note?: string, accountId?: string) => void;
  logPersonalDebtPayment: (debtId: string, amount: number, note?: string, accountId?: string) => void;
  markBillPaid: (billId: string, paidDate?: string, accountId?: string) => void;
}

export const DUE_ITEM_BADGE_LABELS: Record<DueItemSource, string> = {
  bill: 'Bill',
  loan: 'Loan',
  installment: 'Installment',
  'credit-card': 'Credit Card',
  'debt-i-owe': 'Debt I Owe',
  'debt-owed-to-me': 'Owed To Me',
};

const getDueTime = (value: string) => {
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

const getDueStatus = (dueDate: string, now: Date) =>
  getDueTime(dueDate) < now.getTime() ? ('overdue' as const) : ('pending' as const);

const getCreditCardDueAmount = (card: CreditCard) => {
  if (card.minimumPayment > 0) return card.minimumPayment;

  const paidThisCycle =
    typeof card.lastPaymentDate === 'string' &&
    card.lastPaymentDate.length > 0 &&
    card.lastPaymentDate >= card.dueDate;

  return paidThisCycle ? 0 : card.currentBalance;
};

export const settleDueItem = (
  item: DueItem,
  actions: DueItemPaymentActions,
  note = 'Marked paid from Bills and Due Dates',
  accountId?: string,
) => {
  switch (item.sourceType) {
    case 'bill':
      actions.markBillPaid(item.sourceId, undefined, accountId);
      return true;
    case 'loan':
    case 'installment':
      actions.logLoanPayment(item.sourceId, item.amount, note, accountId);
      return true;
    case 'credit-card':
      actions.logCreditCardPayment(item.sourceId, item.amount, note, accountId);
      return true;
    case 'debt-i-owe':
    case 'debt-owed-to-me':
      actions.logPersonalDebtPayment(item.sourceId, item.amount, note, accountId);
      return true;
    default:
      return false;
  }
};

export const getDueItems = ({
  bills,
  loans,
  creditCards,
  personalDebts,
  referenceDate = new Date(),
}: {
  bills: Bill[];
  loans: Loan[];
  creditCards: CreditCard[];
  personalDebts: PersonalDebt[];
  referenceDate?: Date;
}) => {
  const dueItems: DueItem[] = [];

  bills
    .filter((bill) => bill.status !== 'paid')
    .forEach((bill) => {
      dueItems.push({
        id: `bill-${bill.id}`,
        sourceId: bill.id,
        sourceType: 'bill',
        title: bill.name,
        dueDate: bill.dueDate,
        amount: bill.amount,
        status: bill.status === 'overdue' ? 'overdue' : getDueStatus(bill.dueDate, referenceDate),
        detail: bill.recurring ? `${bill.category} - Recurring bill` : `${bill.category} - One-time bill`,
      });
    });

  loans.forEach((loan) => {
    const nextDue = getLoanNextDueEntry(loan, referenceDate);
    const nextDueAmount = nextDue ? Math.max(0, nextDue.amount - nextDue.paidAmount) : 0;
    if (!nextDue || nextDueAmount <= 0) return;

    dueItems.push({
      id: `${loan.type}-${loan.id}`,
      sourceId: loan.id,
      sourceType: loan.type === 'installment' ? 'installment' : 'loan',
      title: loan.name,
      dueDate: nextDue.dueDate,
      amount: nextDueAmount,
      status: getDueStatus(nextDue.dueDate, referenceDate),
      detail: loan.type === 'installment' ? 'Installment due' : 'Loan due',
    });
  });

  creditCards
    .filter((card) => Boolean(card.dueDate))
    .forEach((card) => {
      const dueAmount = Math.max(0, getCreditCardDueAmount(card));
      if (dueAmount <= 0) return;

      dueItems.push({
        id: `credit-card-${card.id}`,
        sourceId: card.id,
        sourceType: 'credit-card',
        title: card.name,
        dueDate: card.dueDate,
        amount: dueAmount,
        status: getDueStatus(card.dueDate, referenceDate),
        detail: `Credit card due - ${card.issuer}`,
      });
    });

  personalDebts
    .filter((debt) => debt.status !== 'settled' && debt.dueDate && debt.amount > debt.paidAmount)
    .forEach((debt) => {
      const remaining = Math.max(0, debt.amount - debt.paidAmount);
      dueItems.push({
        id: `debt-${debt.id}`,
        sourceId: debt.id,
        sourceType: debt.direction === 'iOwe' ? 'debt-i-owe' : 'debt-owed-to-me',
        title: debt.personName,
        dueDate: debt.dueDate!,
        amount: remaining,
        status: getDueStatus(debt.dueDate!, referenceDate),
        detail: debt.direction === 'iOwe' ? 'Personal debt you owe' : 'Personal debt owed to you',
      });
    });

  return dueItems.sort((left, right) => getDueTime(left.dueDate) - getDueTime(right.dueDate));
};
