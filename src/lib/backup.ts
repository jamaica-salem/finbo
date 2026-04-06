import type { Account, FinanceBackupSnapshot, FinanceDataState, Transaction } from '@/types/finance';

const csvEscape = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const normalizeCell = (value: unknown) => String(value ?? '').trim();

export const buildFinanceBackupSnapshot = (data: FinanceDataState): FinanceBackupSnapshot => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  data: {
    accounts: [...data.accounts],
    transactions: [...data.transactions],
    loans: [...data.loans],
    loanPayments: [...data.loanPayments],
    creditCards: [...data.creditCards],
    creditCardActivities: [...data.creditCardActivities],
    budgets: [...data.budgets],
    bills: [...data.bills],
    savingsGoals: [...data.savingsGoals],
    savingsGoalContributions: [...data.savingsGoalContributions],
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
      loans: data.loans as FinanceDataState['loans'],
      loanPayments: data.loanPayments as FinanceDataState['loanPayments'],
      creditCards: data.creditCards as FinanceDataState['creditCards'],
      creditCardActivities: data.creditCardActivities as FinanceDataState['creditCardActivities'],
      budgets: Array.isArray(data.budgets) ? (data.budgets as FinanceDataState['budgets']) : [],
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
