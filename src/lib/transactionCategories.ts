import type { Transaction } from '@/types/finance';

export const DEFAULT_TRANSACTION_CATEGORIES = [
  'Salary',
  'Freelance',
  'Rent',
  'Food',
  'Transport',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Health',
  'Other',
];

export const buildTransactionCategoryOptions = (transactions: Transaction[]) => {
  const categories = new Set<string>(DEFAULT_TRANSACTION_CATEGORIES);

  transactions.forEach((transaction) => {
    (transaction.categories?.length ? transaction.categories : [transaction.category]).forEach((category) => {
      const normalized = category.trim();
      if (normalized) {
        categories.add(normalized);
      }
    });
  });

  return Array.from(categories);
};

export const CATEGORY_COLOR_PALETTE = [
  '#22c55e',
  '#0ea5e9',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#6366f1',
  '#84cc16',
];

const hashCategory = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const getCategoryColor = (
  category: string,
  categoryColors: Record<string, string>,
  fallbackIndex = 0,
) => {
  const normalized = category.trim();
  if (categoryColors[normalized]) return categoryColors[normalized];
  if (normalized.length === 0) return CATEGORY_COLOR_PALETTE[fallbackIndex % CATEGORY_COLOR_PALETTE.length];
  return CATEGORY_COLOR_PALETTE[hashCategory(normalized) % CATEGORY_COLOR_PALETTE.length];
};
