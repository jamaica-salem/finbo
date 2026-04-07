import { describe, expect, it } from 'vitest';
import type { CreditCard, Loan } from '@/types/finance';
import {
  getLoanNextDueAmount,
  deriveLoanMonthlyInterestRate,
  getCreditCardTotalWithInterest,
  getLoanNextDueDate,
  getLoanTotalWithInterest,
} from '@/lib/interest';
import { format } from 'date-fns';

describe('interest helpers', () => {
  it('derives the monthly loan rate from a repayment schedule', () => {
    const loan = {
      totalAmount: 1000,
      monthlyPayment: 275,
      startDate: '2024-01-01',
      endDate: '2024-05-15',
      dueDay: 15,
      repaymentSchedule: [
        { id: '1', dueDate: '2024-02-15', amount: 250, paidAmount: 250 },
        { id: '2', dueDate: '2024-03-15', amount: 300, paidAmount: 0 },
        { id: '3', dueDate: '2024-04-15', amount: 250, paidAmount: 0 },
        { id: '4', dueDate: '2024-05-15', amount: 300, paidAmount: 0 },
      ],
      paidAmount: 250,
    } as Loan;
    expect(deriveLoanMonthlyInterestRate(loan)).toBe(2.5);
    expect(getLoanTotalWithInterest(loan)).toBe(1100);
  });

  it('computes the next due date and amount from the repayment schedule', () => {
    const loan = {
      startDate: '2024-01-01',
      endDate: '2024-06-20',
      dueDay: 15,
      totalAmount: 1000,
      monthlyPayment: 110,
      monthlyInterestRate: 1,
      paidAmount: 250,
      name: 'Test',
      type: 'loan',
      repaymentSchedule: [
        { id: '1', dueDate: '2024-02-15', amount: 250, paidAmount: 250 },
        { id: '2', dueDate: '2024-03-15', amount: 300, paidAmount: 0 },
        { id: '3', dueDate: '2024-04-15', amount: 250, paidAmount: 0 },
      ],
    } as Loan;

    expect(format(getLoanNextDueDate(loan, new Date('2024-02-01')) ?? new Date(0), 'yyyy-MM-dd')).toBe('2024-03-15');
    expect(getLoanNextDueAmount(loan)).toBe(300);
  });

  it('computes credit card total with interest from the original balance', () => {
    const card = { paidAmount: 200, currentBalance: 800, monthlyInterestRate: 10 } as CreditCard;
    expect(getCreditCardTotalWithInterest(card)).toBe(1080);
  });
});
