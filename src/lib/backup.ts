import type { Account, CategoryRule, FinanceBackupSnapshot, FinanceDataState, Transaction } from '@/types/finance';

const csvEscape = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const normalizeCell = (value: unknown) => String(value ?? '').trim();

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const toRecord = (value: unknown): Record<string, string> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, string>) : {});

export const buildFinanceBackupSnapshot = (data: FinanceDataState): FinanceBackupSnapshot => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  data: {
    accounts: [...toArray<Account>(data.accounts)],
    transactions: [...toArray<Transaction>(data.transactions)],
    recurringTransactionRules: [...toArray(data.recurringTransactionRules)],
    loans: [...toArray(data.loans)],
    loanPayments: [...toArray(data.loanPayments)],
    personalDebts: [...toArray(data.personalDebts)],
    personalDebtPayments: [...toArray(data.personalDebtPayments)],
    creditCards: [...toArray(data.creditCards)],
    creditCardActivities: [...toArray(data.creditCardActivities)],
    categoryRules: [...toArray((data as FinanceDataState & { categoryRules?: unknown }).categoryRules)],
    transactionCategories: [...toArray((data as FinanceDataState & { transactionCategories?: unknown }).transactionCategories)],
    savingsCategories: [...toArray((data as FinanceDataState & { savingsCategories?: unknown }).savingsCategories)],
    sharedCategories: [...toArray((data as FinanceDataState & { sharedCategories?: unknown }).sharedCategories)],
    budgets: [...toArray(data.budgets)],
    categoryColors: { ...toRecord(data.categoryColors) },
    bills: [...toArray(data.bills)],
    savingsGoals: [...toArray(data.savingsGoals)],
    savingsGoalContributions: [...toArray(data.savingsGoalContributions)],
    currency: data.currency,
  },
});

export const normalizeFinanceBackupSnapshot = (value: unknown): FinanceBackupSnapshot | null => {
  if (!value || typeof value !== 'object') return null;
  const snapshot = value as Partial<FinanceBackupSnapshot>;
  if (snapshot.version !== 1 || !snapshot.data || typeof snapshot.data !== 'object') return null;

  const data = snapshot.data as Partial<FinanceDataState>;
  if (
    !Array.isArray(data.accounts) ||
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.loans) ||
    !Array.isArray(data.loanPayments) ||
    !Array.isArray(data.creditCards) ||
    !Array.isArray(data.creditCardActivities) ||
    !Array.isArray(data.bills) ||
    !Array.isArray(data.savingsGoals) ||
    !Array.isArray(data.savingsGoalContributions)
  ) {
    return null;
  }

  return {
    version: 1,
    exportedAt: typeof snapshot.exportedAt === 'string' ? snapshot.exportedAt : new Date().toISOString(),
    data: {
      accounts: data.accounts as Account[],
      transactions: data.transactions as Transaction[],
      recurringTransactionRules: Array.isArray(data.recurringTransactionRules)
        ? (data.recurringTransactionRules as FinanceDataState['recurringTransactionRules'])
        : [],
      loans: data.loans as FinanceDataState['loans'],
      loanPayments: data.loanPayments as FinanceDataState['loanPayments'],
      personalDebts: Array.isArray(data.personalDebts) ? (data.personalDebts as FinanceDataState['personalDebts']) : [],
      personalDebtPayments: Array.isArray(data.personalDebtPayments) ? (data.personalDebtPayments as FinanceDataState['personalDebtPayments']) : [],
      creditCards: data.creditCards as FinanceDataState['creditCards'],
      creditCardActivities: data.creditCardActivities as FinanceDataState['creditCardActivities'],
      categoryRules: (data as FinanceDataState & { categoryRules?: CategoryRule[] }).categoryRules ?? [],
      transactionCategories: (data as FinanceDataState & { transactionCategories?: string[] }).transactionCategories ?? [],
      savingsCategories: (data as FinanceDataState & { savingsCategories?: string[] }).savingsCategories ?? [],
      sharedCategories: (data as FinanceDataState & { sharedCategories?: string[] }).sharedCategories ?? [],
      budgets: Array.isArray(data.budgets) ? (data.budgets as FinanceDataState['budgets']) : [],
      categoryColors: (data.categoryColors as FinanceDataState['categoryColors']) ?? {},
      bills: data.bills as FinanceDataState['bills'],
      savingsGoals: data.savingsGoals as FinanceDataState['savingsGoals'],
      savingsGoalContributions: data.savingsGoalContributions as FinanceDataState['savingsGoalContributions'],
      currency: typeof data.currency === 'string' ? data.currency : '₱',
    },
  };
};

export const downloadTextFile = (filename: string, contents: string, mimeType: string) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportTransactionsCsv = (transactions: Transaction[], accounts: Account[]) => {
  const headers = ['date', 'type', 'amount', 'category', 'description', 'accountName', 'accountId'];
  const rows = transactions.map((transaction) => {
    const account = accounts.find((item) => item.id === transaction.accountId);
    return [
      transaction.date,
      transaction.type,
      String(transaction.amount),
      transaction.category,
      transaction.description,
      account?.name ?? '',
      transaction.accountId,
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(normalizeCell(cell))).join(','))
    .join('\n');
};

const serializeCsvTable = (title: string, headers: string[], rows: string[][]) => {
  const lines = [`# ${title}`, headers.join(','), ...rows.map((row) => row.map((cell) => csvEscape(normalizeCell(cell))).join(','))];
  return lines.join('\n');
};

export const exportFinanceCsv = (data: FinanceDataState) => {
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const recurringTransactionRules = Array.isArray(data.recurringTransactionRules) ? data.recurringTransactionRules : [];
  const categoryRules = Array.isArray((data as FinanceDataState & { categoryRules?: any[] }).categoryRules)
    ? (data as FinanceDataState & { categoryRules?: any[] }).categoryRules
    : [];
  const transactionCategories = Array.isArray((data as FinanceDataState & { transactionCategories?: string[] }).transactionCategories)
    ? (data as FinanceDataState & { transactionCategories?: string[] }).transactionCategories
    : [];
  const savingsCategories = Array.isArray((data as FinanceDataState & { savingsCategories?: string[] }).savingsCategories)
    ? (data as FinanceDataState & { savingsCategories?: string[] }).savingsCategories
    : [];
  const sharedCategories = Array.isArray((data as FinanceDataState & { sharedCategories?: string[] }).sharedCategories)
    ? (data as FinanceDataState & { sharedCategories?: string[] }).sharedCategories
    : [];
  const budgets = Array.isArray(data.budgets) ? data.budgets : [];
  const loans = Array.isArray(data.loans) ? data.loans : [];
  const loanPayments = Array.isArray(data.loanPayments) ? data.loanPayments : [];
  const personalDebts = Array.isArray(data.personalDebts) ? data.personalDebts : [];
  const personalDebtPayments = Array.isArray(data.personalDebtPayments) ? data.personalDebtPayments : [];
  const creditCards = Array.isArray(data.creditCards) ? data.creditCards : [];
  const creditCardActivities = Array.isArray(data.creditCardActivities) ? data.creditCardActivities : [];
  const bills = Array.isArray(data.bills) ? data.bills : [];
  const savingsGoals = Array.isArray(data.savingsGoals) ? data.savingsGoals : [];
  const savingsGoalContributions = Array.isArray(data.savingsGoalContributions) ? data.savingsGoalContributions : [];
  const categoryColors = data.categoryColors ?? {};
  const currency = data.currency ?? '₱';

  const sections = [
    serializeCsvTable(
      'Accounts',
      ['id', 'name', 'type', 'balance', 'currency', 'color'],
      accounts.map((account) => [
        account.id,
        account.name,
        account.type,
        String(account.balance),
        account.currency,
        account.color,
      ]),
    ),
    serializeCsvTable(
      'Transactions',
      ['id', 'accountId', 'type', 'amount', 'category', 'categories', 'description', 'date', 'tags', 'recurringRuleId', 'scheduledDate'],
      transactions.map((transaction) => [
        transaction.id,
        transaction.accountId,
        transaction.type,
        String(transaction.amount),
        transaction.category,
        (transaction.categories ?? []).join('; '),
        transaction.description,
        transaction.date,
        (transaction.tags ?? []).join('; '),
        transaction.recurringRuleId ?? '',
        transaction.scheduledDate ?? '',
      ]),
    ),
    serializeCsvTable(
      'Recurring Rules',
      ['id', 'label', 'accountId', 'type', 'amount', 'category', 'description', 'frequency', 'intervalDays', 'startDate', 'nextRunDate', 'endDate', 'active', 'createdAt', 'lastGeneratedDate'],
      recurringTransactionRules.map((rule) => [
        rule.id,
        rule.label,
        rule.accountId,
        rule.type,
        String(rule.amount),
        rule.category,
        rule.description,
        rule.frequency,
        String(rule.intervalDays ?? ''),
        rule.startDate,
        rule.nextRunDate,
        rule.endDate ?? '',
        String(rule.active),
        rule.createdAt,
        rule.lastGeneratedDate ?? '',
      ]),
    ),
    serializeCsvTable(
      'Category Rules',
      ['id', 'pattern', 'category', 'matchType', 'active', 'createdAt', 'updatedAt'],
      categoryRules.map((rule: any) => [
        rule.id,
        rule.pattern,
        rule.category,
        rule.matchType,
        String(rule.active),
        rule.createdAt,
        rule.updatedAt,
      ]),
    ),
    serializeCsvTable('Transaction Categories', ['name'], transactionCategories.map((value) => [value])),
    serializeCsvTable('Savings Categories', ['name'], savingsCategories.map((value) => [value])),
    serializeCsvTable('Shared Categories', ['name'], sharedCategories.map((value) => [value])),
    serializeCsvTable(
      'Budgets',
      ['id', 'category', 'limitAmount', 'alertThresholdPct', 'active', 'createdAt', 'updatedAt', 'lastWarningMonthKey', 'lastExceededMonthKey'],
      budgets.map((budget) => [
        budget.id,
        budget.category,
        String(budget.limitAmount),
        String(budget.alertThresholdPct),
        String(budget.active),
        budget.createdAt,
        budget.updatedAt,
        budget.lastWarningMonthKey ?? '',
        budget.lastExceededMonthKey ?? '',
      ]),
    ),
    serializeCsvTable(
      'Loans',
      ['id', 'name', 'totalAmount', 'paidAmount', 'monthlyPayment', 'monthlyInterestRate', 'startDate', 'dueDay', 'endDate', 'repaymentSchedule', 'type'],
      loans.map((loan) => [
        loan.id,
        loan.name,
        String(loan.totalAmount),
        String(loan.paidAmount),
        String(loan.monthlyPayment),
        String(loan.monthlyInterestRate),
        loan.startDate,
        String(loan.dueDay),
        loan.endDate,
        JSON.stringify(loan.repaymentSchedule ?? []),
        loan.type,
      ]),
    ),
    serializeCsvTable(
      'Loan Payments',
      ['id', 'loanId', 'amount', 'date', 'note'],
      loanPayments.map((payment) => [
        payment.id,
        payment.loanId,
        String(payment.amount),
        payment.date,
        payment.note ?? '',
      ]),
    ),
    serializeCsvTable(
      'Personal Debts',
      ['id', 'personName', 'direction', 'amount', 'paidAmount', 'dueDate', 'note', 'createdAt', 'updatedAt', 'status'],
      personalDebts.map((debt) => [
        debt.id,
        debt.personName,
        debt.direction,
        String(debt.amount),
        String(debt.paidAmount),
        debt.dueDate ?? '',
        debt.note ?? '',
        debt.createdAt,
        debt.updatedAt,
        debt.status,
      ]),
    ),
    serializeCsvTable(
      'Personal Debt Payments',
      ['id', 'debtId', 'amount', 'date', 'note'],
      personalDebtPayments.map((payment) => [
        payment.id,
        payment.debtId,
        String(payment.amount),
        payment.date,
        payment.note ?? '',
      ]),
    ),
    serializeCsvTable(
      'Credit Cards',
      ['id', 'name', 'issuer', 'network', 'creditLimit', 'paidAmount', 'currentBalance', 'statementBalance', 'minimumPayment', 'monthlyInterestRate', 'rewardsRate', 'annualFee', 'dueDate', 'statementCloseDate', 'openedDate', 'autopay', 'rewardsPoints', 'lastPaymentDate'],
      creditCards.map((card) => [
        card.id,
        card.name,
        card.issuer,
        card.network,
        String(card.creditLimit),
        String(card.paidAmount),
        String(card.currentBalance),
        String(card.statementBalance),
        String(card.minimumPayment),
        String(card.monthlyInterestRate),
        String(card.rewardsRate),
        String(card.annualFee),
        card.dueDate,
        card.statementCloseDate,
        card.openedDate,
        String(card.autopay),
        String(card.rewardsPoints),
        card.lastPaymentDate ?? '',
      ]),
    ),
    serializeCsvTable(
      'Credit Card Activity',
      ['id', 'cardId', 'type', 'amount', 'date', 'note'],
      creditCardActivities.map((activity) => [
        activity.id,
        activity.cardId,
        activity.type,
        String(activity.amount),
        activity.date,
        activity.note ?? '',
      ]),
    ),
    serializeCsvTable(
      'Bills',
      ['id', 'name', 'amount', 'category', 'dueDate', 'recurring', 'status', 'paidDate', 'lastPaidDate'],
      bills.map((bill) => [
        bill.id,
        bill.name,
        String(bill.amount),
        bill.category,
        bill.dueDate,
        String(bill.recurring),
        bill.status,
        bill.paidDate ?? '',
        // lastPaidDate may be used for recurring bills
        // keep backward compatibility when missing
        //
        (bill as any).lastPaidDate ?? '',
      ]),
    ),
    serializeCsvTable(
      'Savings Goals',
      ['id', 'name', 'category', 'targetAmount', 'savedAmount', 'targetDate', 'createdAt', 'completedAt', 'note'],
      savingsGoals.map((goal) => [
        goal.id,
        goal.name,
        goal.category,
        String(goal.targetAmount),
        String(goal.savedAmount),
        goal.targetDate ?? '',
        goal.createdAt,
        goal.completedAt ?? '',
        goal.note ?? '',
      ]),
    ),
    serializeCsvTable(
      'Savings Contributions',
      ['id', 'goalId', 'amount', 'date', 'note'],
      savingsGoalContributions.map((contribution) => [
        contribution.id,
        contribution.goalId,
        String(contribution.amount),
        contribution.date,
        contribution.note ?? '',
      ]),
    ),
    serializeCsvTable(
      'Category Colors',
      ['category', 'color'],
      Object.entries(categoryColors).map(([category, color]) => [category, color]),
    ),
    serializeCsvTable(
      'Currency',
      ['symbol'],
      [[currency]],
    ),
  ];

  return sections.join('\n\n');
};

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

export const parseCsvTable = (contents: string): CsvTable => {
  const rows: string[][] = [];
  let currentCell = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushCell = () => {
    currentRow.push(currentCell);
    currentCell = '';
  };

  const pushRow = () => {
    if (currentCell.length > 0 || currentRow.length > 0) {
      rows.push(currentRow);
    }
    currentRow = [];
    currentCell = '';
  };

  for (let i = 0; i < contents.length; i += 1) {
    const char = contents[i];
    const next = contents[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      pushCell();
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      pushCell();
      pushRow();
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    pushCell();
    pushRow();
  }

  const [headers = [], ...dataRows] = rows;
  return {
    headers: headers.map((header) => header.trim()),
    rows: dataRows.map((row) => row.map((cell) => cell.trim())),
  };
};

export const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '');
