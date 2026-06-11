import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '@/store/financeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Wallet, Building2, Smartphone, Pencil, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { buildTransactionCategoryOptions, getCategoryColor } from '@/lib/transactionCategories';
import type { AccountType, RecurringTransactionFrequency } from '@/types/finance';
const ACCOUNT_ICONS: Record<AccountType, React.ElementType> = { bank: Building2, 'digital-bank': Building2, cash: Wallet, 'e-wallet': Smartphone };
const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = { bank: 'Bank', 'digital-bank': 'Digital Bank', cash: 'Cash', 'e-wallet': 'E-Wallet' };
const TRANSACTIONS_PER_PAGE = 20;

export default function AccountsPage() {
  const {
    accounts,
    transactions,
    recurringTransactionRules,
    categoryColors,
    transactionCategories,
    sharedCategories,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addRecurringTransactionRule,
    updateRecurringTransactionRule,
    deleteRecurringTransactionRule,
    currency,
  } = useFinanceStore();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [editRecurringId, setEditRecurringId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [txSearch, setTxSearch] = useState('');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [txAmountMin, setTxAmountMin] = useState('');
  const [txAmountMax, setTxAmountMax] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<
    | { type: 'account'; id: string; label: string }
    | { type: 'transaction'; id: string; label: string }
    | { type: 'rule'; id: string; label: string }
    | null
  >(null);

  // Edit account
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editAName, setEditAName] = useState('');
  const [editAType, setEditAType] = useState<AccountType>('bank');
  const [editABal, setEditABal] = useState('0');
  const [editAccountErrors, setEditAccountErrors] = useState<{ name?: string; balance?: string }>({});

  // Add money to account
  const [addMoneyAccountId, setAddMoneyAccountId] = useState<string | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState('0');
  const [addMoneyDescription, setAddMoneyDescription] = useState('');
  const [addMoneyDate, setAddMoneyDate] = useState(new Date().toISOString().split('T')[0]);
  const [addMoneyErrors, setAddMoneyErrors] = useState<{ amount?: string; date?: string }>({});

  // Add account form
  const [aName, setAName] = useState('');
  const [aType, setAType] = useState<AccountType>('bank');
  const [aBal, setABal] = useState('0');
  const [addAccountErrors, setAddAccountErrors] = useState<{ name?: string; balance?: string }>({});

  // Add transaction form
  const [txAccount, setTxAccount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [txTransferAccount, setTxTransferAccount] = useState('');
  const [txAmount, setTxAmount] = useState('0');
  const [txCategory, setTxCategory] = useState('');
  const [txExtraCategory, setTxExtraCategory] = useState('');
  const [txTags, setTxTags] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit transaction form
  const [editTxAccount, setEditTxAccount] = useState('');
  const [editTxType, setEditTxType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [editTxTransferAccount, setEditTxTransferAccount] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('0');
  const [editTxCategory, setEditTxCategory] = useState('');
  const [editTxExtraCategory, setEditTxExtraCategory] = useState('');
  const [editTxTags, setEditTxTags] = useState('');
  const [editTxDesc, setEditTxDesc] = useState('');
  const [editTxDate, setEditTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [addTxErrors, setAddTxErrors] = useState<{ account?: string; transfer?: string; amount?: string; category?: string; date?: string }>({});
  const [editTxErrors, setEditTxErrors] = useState<{ account?: string; transfer?: string; amount?: string; category?: string; date?: string }>({});

  // Recurring transaction rule
  const [ruleLabel, setRuleLabel] = useState('');
  const [ruleAccountId, setRuleAccountId] = useState(accounts[0]?.id ?? '');
  const [ruleType, setRuleType] = useState<'income' | 'expense'>('expense');
  const [ruleAmount, setRuleAmount] = useState('0');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleFrequency, setRuleFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [ruleIntervalDays, setRuleIntervalDays] = useState('30');
  const [ruleStartDate, setRuleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [ruleNextRunDate, setRuleNextRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [ruleEndDate, setRuleEndDate] = useState('');
  const [ruleActive, setRuleActive] = useState(true);

  // Edit recurring rule
  const [editRuleLabel, setEditRuleLabel] = useState('');
  const [editRuleAccountId, setEditRuleAccountId] = useState(accounts[0]?.id ?? '');
  const [editRuleType, setEditRuleType] = useState<'income' | 'expense'>('expense');
  const [editRuleAmount, setEditRuleAmount] = useState('0');
  const [editRuleCategory, setEditRuleCategory] = useState('');
  const [editRuleDescription, setEditRuleDescription] = useState('');
  const [editRuleFrequency, setEditRuleFrequency] = useState<RecurringTransactionFrequency>('monthly');
  const [editRuleIntervalDays, setEditRuleIntervalDays] = useState('30');
  const [editRuleStartDate, setEditRuleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [editRuleNextRunDate, setEditRuleNextRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [editRuleEndDate, setEditRuleEndDate] = useState('');
  const [editRuleActive, setEditRuleActive] = useState(true);
  const [addRuleErrors, setAddRuleErrors] = useState<{ label?: string; account?: string; amount?: string; category?: string; startDate?: string; nextRunDate?: string; intervalDays?: string }>({});
  const [editRuleErrors, setEditRuleErrors] = useState<{ label?: string; account?: string; amount?: string; category?: string; startDate?: string; nextRunDate?: string; intervalDays?: string }>({});

  useEffect(() => {
    if (!accounts.length) {
      setRuleAccountId('');
      setEditRuleAccountId('');
      return;
    }

    if (!accounts.some((account) => account.id === ruleAccountId)) {
      setRuleAccountId(accounts[0].id);
    }
    if (!accounts.some((account) => account.id === editRuleAccountId)) {
      setEditRuleAccountId(accounts[0].id);
    }
  }, [accounts, editRuleAccountId, ruleAccountId]);

  const handleAddAccount = () => {
    setAddAccountErrors({});
    const errors: typeof addAccountErrors = {};
    const balance = Number(aBal);
    if (!aName.trim()) errors.name = 'Account name is required';
    if (!Number.isFinite(balance) || balance < 0) errors.balance = 'Initial balance cannot be negative';
    if (Object.keys(errors).length > 0) {
      setAddAccountErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    addAccount({ name: aName.trim(), type: aType, balance, currency, color: 'hsl(172, 66%, 40%)' });
    setAName('');
    setAType('bank');
    setABal('0');
    setAddAccountErrors({});
    setShowAddAccount(false);
  };

  const openEditAccount = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    setEditAccountErrors({});
    setEditAccountId(id);
    setEditAName(acc.name);
    setEditAType(acc.type);
    setEditABal(String(acc.balance));
  };

  const handleEditAccount = () => {
    setEditAccountErrors({});
    const errors: typeof editAccountErrors = {};
    if (!editAccountId) return;
    const balance = Number(editABal);
    if (!editAName.trim()) errors.name = 'Account name is required';
    if (!Number.isFinite(balance) || balance < 0) errors.balance = 'Balance cannot be negative';
    if (Object.keys(errors).length > 0) {
      setEditAccountErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    updateAccount(editAccountId, { name: editAName.trim(), type: editAType, balance });
    setEditAccountErrors({});
    setEditAccountId(null);
  };

  const openAddMoney = (id: string) => {
    setAddMoneyErrors({});
    setAddMoneyAccountId(id);
    setAddMoneyAmount('0');
    setAddMoneyDescription('');
    setAddMoneyDate(new Date().toISOString().split('T')[0]);
  };

  const handleAddMoney = () => {
    setAddMoneyErrors({});
    const errors: typeof addMoneyErrors = {};
    const amount = Number(addMoneyAmount);
    if (!addMoneyAccountId) return;
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than 0';
    if (!addMoneyDate) errors.date = 'Date is required';
    if (Object.keys(errors).length > 0) {
      setAddMoneyErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    addTransaction({
      accountId: addMoneyAccountId,
      type: 'income',
      amount,
      category: 'Income',
      categories: ['Income'],
      tags: [],
      description: addMoneyDescription.trim() || 'Added money',
      date: addMoneyDate,
    });
    setAddMoneyErrors({});
    setAddMoneyAccountId(null);
    toast.success('Money added');
  };

  const handleAddTx = () => {
    setAddTxErrors({});
    const errors: typeof addTxErrors = {};
    const isTransfer = txType === 'transfer';
    const primaryCategory = isTransfer ? 'Transfer' : txCategory.trim() || txExtraCategory.trim();
    const extraCategory = txCategory.trim() && txExtraCategory.trim() && txExtraCategory.trim() !== txCategory.trim()
      ? txExtraCategory.trim()
      : '';

    const amount = Number(txAmount);
    if (!txAccount) errors.account = 'Account is required';
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than 0';
    if (!primaryCategory) errors.category = 'Category is required';
    if (!txDate) errors.date = 'Date is required';
    if (isTransfer && !txTransferAccount) errors.transfer = 'Destination account is required';
    if (isTransfer && txTransferAccount === txAccount) errors.transfer = 'Destination must be different from source account';
    if (Object.keys(errors).length > 0) {
      setAddTxErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    addTransaction({
      accountId: txAccount,
      type: txType,
      transferAccountId: isTransfer ? txTransferAccount : undefined,
      amount,
      category: primaryCategory,
      categories: isTransfer ? ['Transfer'] : [primaryCategory, extraCategory].filter(Boolean),
      tags: txTags.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean),
      description: txDesc,
      date: txDate,
    });
    setTxAmount('');
    setTxExtraCategory('');
    setTxTags('');
    setTxDesc('');
    setTxTransferAccount('');
    setAddTxErrors({});
    setShowAddTx(false);
  };

  const openEditTransaction = (txId: string) => {
    const tx = transactions.find((item) => item.id === txId);
    if (!tx) return;
    setEditTxErrors({});
    const txCategories = tx.categories?.length ? tx.categories : [tx.category];
    const primaryCategory = txCategories[0] ?? tx.category;
    const extraCategory = txCategories[1] ?? '';

    setEditTxId(txId);
    setEditTxAccount(tx.accountId);
    setEditTxType(tx.type);
    setEditTxTransferAccount(tx.transferAccountId ?? '');
    setEditTxAmount(String(tx.amount));
    setEditTxCategory(primaryCategory);
    setEditTxExtraCategory(extraCategory);
    setEditTxTags((tx.tags ?? []).join(', '));
    setEditTxDesc(tx.description);
    setEditTxDate(tx.date);
  };

  const handleEditTx = () => {
    setEditTxErrors({});
    const errors: typeof editTxErrors = {};
    if (!editTxId) return;
    const isTransfer = editTxType === 'transfer';

    const primaryCategory = isTransfer ? 'Transfer' : editTxCategory.trim() || editTxExtraCategory.trim();
    const extraCategory = editTxCategory.trim() && editTxExtraCategory.trim() && editTxExtraCategory.trim() !== editTxCategory.trim()
      ? editTxExtraCategory.trim()
      : '';

    const amount = Number(editTxAmount);
    if (!editTxAccount) errors.account = 'Account is required';
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than 0';
    if (!primaryCategory) errors.category = 'Category is required';
    if (!editTxDate) errors.date = 'Date is required';
    if (isTransfer && !editTxTransferAccount) errors.transfer = 'Destination account is required';
    if (isTransfer && editTxTransferAccount === editTxAccount) errors.transfer = 'Destination must be different from source account';
    if (Object.keys(errors).length > 0) {
      setEditTxErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    updateTransaction(editTxId, {
      accountId: editTxAccount,
      type: editTxType,
      transferAccountId: isTransfer ? editTxTransferAccount : undefined,
      amount,
      category: primaryCategory,
      categories: isTransfer ? ['Transfer'] : [primaryCategory, extraCategory].filter(Boolean),
      tags: editTxTags.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean),
      description: editTxDesc,
      date: editTxDate,
    });

    setEditTxErrors({});
    setEditTxId(null);
  };

  const handleAddRecurringRule = () => {
    setAddRuleErrors({});
    const errors: typeof addRuleErrors = {};
    if (!ruleLabel.trim()) errors.label = 'Rule label is required';
    if (!ruleAccountId) errors.account = 'Account is required';
    if (!(parseFloat(ruleAmount) > 0)) errors.amount = 'Amount must be greater than 0';
    if (!ruleCategory) errors.category = 'Category is required';
    if (!ruleStartDate) errors.startDate = 'Start date is required';
    if (!ruleNextRunDate) errors.nextRunDate = 'Next run date is required';
    if (ruleFrequency === 'custom' && !(parseInt(ruleIntervalDays, 10) > 0)) {
      errors.intervalDays = 'Custom interval must be greater than 0';
    }
    if (Object.keys(errors).length > 0) {
      setAddRuleErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    addRecurringTransactionRule({
      label: ruleLabel.trim(),
      accountId: ruleAccountId,
      type: ruleType,
      amount: parseFloat(ruleAmount) || 0,
      category: ruleCategory,
      description: ruleDescription.trim(),
      frequency: ruleFrequency,
      intervalDays: ruleFrequency === 'custom' ? Math.max(1, parseInt(ruleIntervalDays, 10) || 1) : undefined,
      startDate: ruleStartDate,
      nextRunDate: ruleNextRunDate || ruleStartDate,
      endDate: ruleEndDate || undefined,
      active: ruleActive,
    });

    setRuleLabel('');
    setRuleType('expense');
    setRuleAmount('0');
    setRuleCategory('');
    setRuleDescription('');
    setRuleFrequency('monthly');
    setRuleIntervalDays('30');
    setRuleStartDate(new Date().toISOString().split('T')[0]);
    setRuleNextRunDate(new Date().toISOString().split('T')[0]);
    setRuleEndDate('');
    setRuleActive(true);
    setAddRuleErrors({});
    setShowRecurring(false);
  };

  const openEditRecurringRule = (ruleId: string) => {
    const rule = recurringTransactionRules.find((item) => item.id === ruleId);
    if (!rule) return;
    setEditRuleErrors({});

    setEditRecurringId(ruleId);
    setEditRuleLabel(rule.label);
    setEditRuleAccountId(rule.accountId);
    setEditRuleType(rule.type);
    setEditRuleAmount(String(rule.amount));
    setEditRuleCategory(rule.category);
    setEditRuleDescription(rule.description);
    setEditRuleFrequency(rule.frequency);
    setEditRuleIntervalDays(String(rule.intervalDays ?? 30));
    setEditRuleStartDate(rule.startDate);
    setEditRuleNextRunDate(rule.nextRunDate);
    setEditRuleEndDate(rule.endDate ?? '');
    setEditRuleActive(rule.active);
  };

  const handleEditRecurringRule = () => {
    setEditRuleErrors({});
    const errors: typeof editRuleErrors = {};
    if (!editRecurringId) return;
    if (!editRuleLabel.trim()) errors.label = 'Rule label is required';
    if (!editRuleAccountId) errors.account = 'Account is required';
    if (!(parseFloat(editRuleAmount) > 0)) errors.amount = 'Amount must be greater than 0';
    if (!editRuleCategory) errors.category = 'Category is required';
    if (!editRuleStartDate) errors.startDate = 'Start date is required';
    if (!editRuleNextRunDate) errors.nextRunDate = 'Next run date is required';
    if (editRuleFrequency === 'custom' && !(parseInt(editRuleIntervalDays, 10) > 0)) {
      errors.intervalDays = 'Custom interval must be greater than 0';
    }
    if (Object.keys(errors).length > 0) {
      setEditRuleErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    updateRecurringTransactionRule(editRecurringId, {
      label: editRuleLabel.trim(),
      accountId: editRuleAccountId,
      type: editRuleType,
      amount: parseFloat(editRuleAmount) || 0,
      category: editRuleCategory,
      description: editRuleDescription.trim(),
      frequency: editRuleFrequency,
      intervalDays: editRuleFrequency === 'custom' ? Math.max(1, parseInt(editRuleIntervalDays, 10) || 1) : undefined,
      startDate: editRuleStartDate,
      nextRunDate: editRuleNextRunDate || editRuleStartDate,
      endDate: editRuleEndDate || undefined,
      active: editRuleActive,
    });

    setEditRuleErrors({});
    setEditRecurringId(null);
  };

  const accountScopedTransactions = useMemo(
    () => (selectedAccount ? transactions.filter((transaction) => transaction.accountId === selectedAccount) : transactions),
    [selectedAccount, transactions],
  );

  const filteredTx = useMemo(() => {
    const searchTerm = txSearch.trim().toLowerCase();
    const minAmount = Number(txAmountMin);
    const maxAmount = Number(txAmountMax);
    const hasMinAmount = txAmountMin.trim() !== '' && Number.isFinite(minAmount);
    const hasMaxAmount = txAmountMax.trim() !== '' && Number.isFinite(maxAmount);
    const normalizedDateFrom = txDateFrom && txDateTo && txDateFrom > txDateTo ? txDateTo : txDateFrom;
    const normalizedDateTo = txDateFrom && txDateTo && txDateFrom > txDateTo ? txDateFrom : txDateTo;
    const normalizedMinAmount = hasMinAmount && hasMaxAmount && minAmount > maxAmount ? maxAmount : minAmount;
    const normalizedMaxAmount = hasMinAmount && hasMaxAmount && minAmount > maxAmount ? minAmount : maxAmount;

    return accountScopedTransactions.filter((transaction) => {
      if (searchTerm) {
        const searchable = [
          transaction.description,
          transaction.category,
          ...(transaction.categories ?? []),
          ...(transaction.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(searchTerm)) return false;
      }

      if (normalizedDateFrom && transaction.date < normalizedDateFrom) return false;
      if (normalizedDateTo && transaction.date > normalizedDateTo) return false;

      if (hasMinAmount && transaction.amount < normalizedMinAmount) return false;
      if (hasMaxAmount && transaction.amount > normalizedMaxAmount) return false;

      return true;
    });
  }, [accountScopedTransactions, txAmountMax, txAmountMin, txDateFrom, txDateTo, txSearch]);
  const sortedFilteredTx = useMemo(
    () => [...filteredTx].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredTx],
  );
  const totalTransactionPages = Math.max(1, Math.ceil(sortedFilteredTx.length / TRANSACTIONS_PER_PAGE));
  const currentTxPage = Math.min(txPage, totalTransactionPages);
  const paginatedTransactions = useMemo(() => {
    const start = (currentTxPage - 1) * TRANSACTIONS_PER_PAGE;
    return sortedFilteredTx.slice(start, start + TRANSACTIONS_PER_PAGE);
  }, [currentTxPage, sortedFilteredTx]);
  const pageStartIndex = sortedFilteredTx.length === 0 ? 0 : (currentTxPage - 1) * TRANSACTIONS_PER_PAGE + 1;
  const pageEndIndex = Math.min(currentTxPage * TRANSACTIONS_PER_PAGE, sortedFilteredTx.length);
  const hasTransactionFilters =
    txSearch.trim() !== '' || txDateFrom !== '' || txDateTo !== '' || txAmountMin.trim() !== '' || txAmountMax.trim() !== '';

  useEffect(() => {
    setTxPage(1);
  }, [selectedAccount, txSearch, txDateFrom, txDateTo, txAmountMin, txAmountMax]);

  useEffect(() => {
    if (txPage > totalTransactionPages) {
      setTxPage(totalTransactionPages);
    }
  }, [totalTransactionPages, txPage]);

  const clearTransactionFilters = () => {
    setTxSearch('');
    setTxDateFrom('');
    setTxDateTo('');
    setTxAmountMin('');
    setTxAmountMax('');
  };
  const applyQuickDateRange = (preset: 'thisMonth' | 'last30d') => {
    const now = new Date();
    const toIso = (value: Date) => value.toISOString().split('T')[0];

    if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setTxDateFrom(toIso(firstDay));
      setTxDateTo(toIso(now));
      return;
    }

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    setTxDateFrom(toIso(thirtyDaysAgo));
    setTxDateTo(toIso(now));
  };
  const transactionCategoryOptions = useMemo(() => buildTransactionCategoryOptions(transactions, transactionCategories, sharedCategories), [transactions, transactionCategories, sharedCategories]);
  const confirmPendingDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.type === 'account') {
      deleteAccount(pendingDelete.id);
    } else if (pendingDelete.type === 'transaction') {
      deleteTransaction(pendingDelete.id);
    } else if (pendingDelete.type === 'rule') {
      deleteRecurringTransactionRule(pendingDelete.id);
    }

    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage your accounts and transactions"
        actions={
          <>
            <Dialog
              open={showRecurring}
              onOpenChange={(open) => {
                setShowRecurring(open);
                if (!open) setAddRuleErrors({});
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Repeat2 className="h-4 w-4 mr-1" />Recurring</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Add Recurring Rule</DialogTitle></DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Rule label</Label>
                    <Input placeholder="e.g. Monthly salary" value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} />
                    {addRuleErrors.label ? <p className="text-sm text-destructive">{addRuleErrors.label}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account</Label>
                    <Select value={ruleAccountId} onValueChange={setRuleAccountId} disabled={!accounts.length}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {addRuleErrors.account ? <p className="text-sm text-destructive">{addRuleErrors.account}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={ruleType} onValueChange={(v) => setRuleType(v as 'income' | 'expense')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input type="number" min="0" step="0.01" value={ruleAmount} onChange={(e) => setRuleAmount(e.target.value)} />
                    {addRuleErrors.amount ? <p className="text-sm text-destructive">{addRuleErrors.amount}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={ruleCategory} onValueChange={setRuleCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {transactionCategoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {addRuleErrors.category ? <p className="text-sm text-destructive">{addRuleErrors.category}</p> : null}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Description</Label>
                    <Input placeholder="e.g. Monthly payroll" value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Select value={ruleFrequency} onValueChange={(v) => setRuleFrequency(v as RecurringTransactionFrequency)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Next run date</Label>
                    <Input type="date" value={ruleNextRunDate} onChange={(e) => setRuleNextRunDate(e.target.value)} />
                    {addRuleErrors.nextRunDate ? <p className="text-sm text-destructive">{addRuleErrors.nextRunDate}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Start date</Label>
                    <Input type="date" value={ruleStartDate} onChange={(e) => setRuleStartDate(e.target.value)} />
                    {addRuleErrors.startDate ? <p className="text-sm text-destructive">{addRuleErrors.startDate}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>End date</Label>
                    <Input type="date" value={ruleEndDate} onChange={(e) => setRuleEndDate(e.target.value)} />
                  </div>
                  {ruleFrequency === 'custom' && (
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Custom interval in days</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={ruleIntervalDays}
                        onChange={(e) => setRuleIntervalDays(e.target.value)}
                      />
                      {addRuleErrors.intervalDays ? <p className="text-sm text-destructive">{addRuleErrors.intervalDays}</p> : null}
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 md:col-span-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Active</p>
                      <p className="text-xs text-muted-foreground">Run automatically on due dates</p>
                    </div>
                    <Switch checked={ruleActive} onCheckedChange={setRuleActive} />
                  </div>
                  <Button className="md:col-span-2" onClick={handleAddRecurringRule} disabled={!accounts.length}>
                    Save recurring rule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showAddAccount}
              onOpenChange={(open) => {
                setShowAddAccount(open);
                if (!open) setAddAccountErrors({});
              }}
            >
            <DialogTrigger asChild>
              <Button className="order-3" size="sm"><Plus className="h-4 w-4 mr-1" />Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Account name</Label>
                  <Input placeholder="e.g. Main Bank" value={aName} onChange={(e) => setAName(e.target.value)} />
                  {addAccountErrors.name ? <p className="text-sm text-destructive">{addAccountErrors.name}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={aType} onValueChange={(v) => setAType(v as AccountType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="e-wallet">E-Wallet</SelectItem>
                      <SelectItem value="digital-bank">Digital Bank</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Initial balance</Label>
                  <Input placeholder="0.00" type="number" value={aBal} onChange={(e) => setABal(e.target.value)} />
                  {addAccountErrors.balance ? <p className="text-sm text-destructive">{addAccountErrors.balance}</p> : null}
                </div>
                <Button className="w-full mt-2" onClick={handleAddAccount}>Add Account</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={showAddTx}
            onOpenChange={(open) => {
              setShowAddTx(open);
              if (!open) setAddTxErrors({});
            }}
          >
            <DialogTrigger asChild>
              <Button className="order-2" variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Transaction</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Select value={txAccount} onValueChange={setTxAccount}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {addTxErrors.account ? <p className="text-sm text-destructive">{addTxErrors.account}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction type</Label>
                  <Select value={txType} onValueChange={(v) => setTxType(v as 'income' | 'expense' | 'transfer')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {txType === 'transfer' && (
                  <div className="space-y-1.5">
                    <Label>Destination account</Label>
                    <Select value={txTransferAccount} onValueChange={setTxTransferAccount}>
                      <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                      <SelectContent>
                        {accounts.filter((a) => a.id !== txAccount).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {addTxErrors.transfer ? <p className="text-sm text-destructive">{addTxErrors.transfer}</p> : null}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input placeholder="0.00" type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                  {addTxErrors.amount ? <p className="text-sm text-destructive">{addTxErrors.amount}</p> : null}
                </div>
                {txType !== 'transfer' && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select value={txCategory} onValueChange={setTxCategory}>
                        <SelectTrigger><SelectValue placeholder="Select a category or add a new one" /></SelectTrigger>
                        <SelectContent>
                          {transactionCategoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {addTxErrors.category ? <p className="text-sm text-destructive">{addTxErrors.category}</p> : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Add category</Label>
                      <Input placeholder="e.g. Groceries - Delivery" value={txExtraCategory} onChange={(e) => setTxExtraCategory(e.target.value)} />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label>Tags</Label>
                  <Input placeholder="e.g. monthly, family, reimbursable" value={txTags} onChange={(e) => setTxTags(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input placeholder="e.g. Groceries" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
                  {addTxErrors.date ? <p className="text-sm text-destructive">{addTxErrors.date}</p> : null}
                </div>
                <Button className="w-full mt-2" onClick={handleAddTx}>Add Transaction</Button>
              </div>
            </DialogContent>
          </Dialog>
          </>
        }
      />

      {/* Edit Account Dialog */}
      <Dialog
        open={!!editAccountId}
        onOpenChange={() => {
          setEditAccountId(null);
          setEditAccountErrors({});
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input placeholder="e.g. Main Bank" value={editAName} onChange={(e) => setEditAName(e.target.value)} />
              {editAccountErrors.name ? <p className="text-sm text-destructive">{editAccountErrors.name}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editAType} onValueChange={(v) => setEditAType(v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="e-wallet">E-Wallet</SelectItem>
                  <SelectItem value="digital-bank">Digital Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Balance</Label>
              <Input placeholder="0.00" type="number" value={editABal} onChange={(e) => setEditABal(e.target.value)} />
              {editAccountErrors.balance ? <p className="text-sm text-destructive">{editAccountErrors.balance}</p> : null}
            </div>
            <Button className="w-full mt-2" onClick={handleEditAccount}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Money Dialog */}
      <Dialog
        open={!!addMoneyAccountId}
        onOpenChange={(open) => {
          if (!open) {
            setAddMoneyAccountId(null);
            setAddMoneyErrors({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Money{addMoneyAccountId ? ` to ${accounts.find((account) => account.id === addMoneyAccountId)?.name ?? 'Account'}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                value={addMoneyAmount}
                onChange={(e) => setAddMoneyAmount(e.target.value)}
              />
              {addMoneyErrors.amount ? <p className="text-sm text-destructive">{addMoneyErrors.amount}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="e.g. Cash deposit"
                value={addMoneyDescription}
                onChange={(e) => setAddMoneyDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={addMoneyDate} onChange={(e) => setAddMoneyDate(e.target.value)} />
              {addMoneyErrors.date ? <p className="text-sm text-destructive">{addMoneyErrors.date}</p> : null}
            </div>
            <Button className="w-full bg-success text-success-foreground hover:bg-success/90" onClick={handleAddMoney}>
              <Plus className="mr-1 h-4 w-4" />
              Add Money
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editTxId}
        onOpenChange={() => {
          setEditTxId(null);
          setEditTxErrors({});
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={editTxAccount} onValueChange={setEditTxAccount}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {editTxErrors.account ? <p className="text-sm text-destructive">{editTxErrors.account}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Transaction type</Label>
              <Select value={editTxType} onValueChange={(v) => setEditTxType(v as 'income' | 'expense' | 'transfer')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editTxType === 'transfer' && (
              <div className="space-y-1.5">
                <Label>Destination account</Label>
                <Select value={editTxTransferAccount} onValueChange={setEditTxTransferAccount}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.id !== editTxAccount).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {editTxErrors.transfer ? <p className="text-sm text-destructive">{editTxErrors.transfer}</p> : null}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input placeholder="0.00" type="number" value={editTxAmount} onChange={(e) => setEditTxAmount(e.target.value)} />
              {editTxErrors.amount ? <p className="text-sm text-destructive">{editTxErrors.amount}</p> : null}
            </div>
            {editTxType !== 'transfer' && (
              <>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={editTxCategory} onValueChange={setEditTxCategory}>
                    <SelectTrigger><SelectValue placeholder="Select a category or add a new one" /></SelectTrigger>
                    <SelectContent>
                      {transactionCategoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {editTxErrors.category ? <p className="text-sm text-destructive">{editTxErrors.category}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Add category</Label>
                  <Input placeholder="e.g. Groceries - Delivery" value={editTxExtraCategory} onChange={(e) => setEditTxExtraCategory(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Input placeholder="e.g. monthly, family, reimbursable" value={editTxTags} onChange={(e) => setEditTxTags(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="e.g. Groceries" value={editTxDesc} onChange={(e) => setEditTxDesc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editTxDate} onChange={(e) => setEditTxDate(e.target.value)} />
              {editTxErrors.date ? <p className="text-sm text-destructive">{editTxErrors.date}</p> : null}
            </div>
            <Button className="w-full mt-2" onClick={handleEditTx}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editRecurringId}
        onOpenChange={() => {
          setEditRecurringId(null);
          setEditRuleErrors({});
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Recurring Rule</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Rule label</Label>
              <Input placeholder="e.g. Monthly salary" value={editRuleLabel} onChange={(e) => setEditRuleLabel(e.target.value)} />
              {editRuleErrors.label ? <p className="text-sm text-destructive">{editRuleErrors.label}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={editRuleAccountId} onValueChange={setEditRuleAccountId} disabled={!accounts.length}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {editRuleErrors.account ? <p className="text-sm text-destructive">{editRuleErrors.account}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editRuleType} onValueChange={(v) => setEditRuleType(v as 'income' | 'expense')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={editRuleAmount} onChange={(e) => setEditRuleAmount(e.target.value)} />
              {editRuleErrors.amount ? <p className="text-sm text-destructive">{editRuleErrors.amount}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editRuleCategory} onValueChange={setEditRuleCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {transactionCategoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {editRuleErrors.category ? <p className="text-sm text-destructive">{editRuleErrors.category}</p> : null}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Input placeholder="e.g. Monthly payroll" value={editRuleDescription} onChange={(e) => setEditRuleDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={editRuleFrequency} onValueChange={(v) => setEditRuleFrequency(v as RecurringTransactionFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Next run date</Label>
              <Input type="date" value={editRuleNextRunDate} onChange={(e) => setEditRuleNextRunDate(e.target.value)} />
              {editRuleErrors.nextRunDate ? <p className="text-sm text-destructive">{editRuleErrors.nextRunDate}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={editRuleStartDate} onChange={(e) => setEditRuleStartDate(e.target.value)} />
              {editRuleErrors.startDate ? <p className="text-sm text-destructive">{editRuleErrors.startDate}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={editRuleEndDate} onChange={(e) => setEditRuleEndDate(e.target.value)} />
            </div>
            {editRuleFrequency === 'custom' && (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Custom interval in days</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={editRuleIntervalDays}
                  onChange={(e) => setEditRuleIntervalDays(e.target.value)}
                />
                {editRuleErrors.intervalDays ? <p className="text-sm text-destructive">{editRuleErrors.intervalDays}</p> : null}
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Run automatically on due dates</p>
              </div>
              <Switch checked={editRuleActive} onCheckedChange={setEditRuleActive} />
            </div>
            <Button className="md:col-span-2" onClick={handleEditRecurringRule} disabled={!accounts.length}>
              Save recurring rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-foreground">Recurring automation</h3>
            <p className="text-sm text-muted-foreground mt-1">Transactions that the scheduler creates automatically on due dates.</p>
          </div>
          <Badge variant="secondary">{recurringTransactionRules.length} rules</Badge>
        </div>

        {recurringTransactionRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring rules yet. Add one to automate income or expenses.</p>
        ) : (
          <div className="space-y-3">
            {recurringTransactionRules
              .slice()
              .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
              .map((rule) => (
                <div key={rule.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{rule.label}</p>
                        <Badge variant={rule.active ? 'default' : 'secondary'}>{rule.active ? 'Active' : 'Paused'}</Badge>
                        <Badge variant="outline" className="capitalize">{rule.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.category} · {rule.description || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Next run: {rule.nextRunDate} · {rule.frequency}
                        {rule.frequency === 'custom' && rule.intervalDays ? ` every ${rule.intervalDays} days` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1">
                        <span className="text-xs text-muted-foreground">Enabled</span>
                        <Switch
                          checked={rule.active}
                          onCheckedChange={(checked) => updateRecurringTransactionRule(rule.id, { active: checked })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => openEditRecurringRule(rule.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setPendingDelete({ type: 'rule', id: rule.id, label: rule.label })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((a) => {
          const Icon = ACCOUNT_ICONS[a.type];
          return (
            <div
              key={a.id}
              onClick={() => setSelectedAccount(selectedAccount === a.id ? null : a.id)}
              className={cn(
                'glass-card rounded-xl p-5 cursor-pointer transition-all hover:shadow-md',
                selectedAccount === a.id && 'ring-2 ring-primary'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[a.type]}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-success/10 text-success hover:bg-success/20 hover:text-success"
                    aria-label={`Add money to ${a.name}`}
                    onClick={(e) => { e.stopPropagation(); openAddMoney(a.id); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEditAccount(a.id); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setPendingDelete({ type: 'account', id: a.id, label: a.name }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xl font-heading font-bold text-foreground mt-3">{currency}{a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          );
        })}
      </div>

      {/* Transactions */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-4">
          {selectedAccount ? `Transactions — ${accounts.find(a => a.id === selectedAccount)?.name}` : 'All Transactions'}
        </h3>
        <div className="mb-4 rounded-xl border border-border/70 bg-background/40 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="tx-search">Search transactions</Label>
              <Input
                id="tx-search"
                placeholder="Search description, tags, or categories"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyQuickDateRange('thisMonth')}>
                This month
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyQuickDateRange('last30d')}>
                Last 30 days
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearTransactionFilters} disabled={!hasTransactionFilters}>
                Clear all
              </Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="tx-date-from">Date from</Label>
              <Input id="tx-date-from" type="date" value={txDateFrom} onChange={(e) => setTxDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date-to">Date to</Label>
              <Input id="tx-date-to" type="date" value={txDateTo} onChange={(e) => setTxDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount-min">Amount min</Label>
              <Input
                id="tx-amount-min"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={txAmountMin}
                onChange={(e) => setTxAmountMin(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount-max">Amount max</Label>
              <Input
                id="tx-amount-max"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={txAmountMax}
                onChange={(e) => setTxAmountMax(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <p>
              Showing {sortedFilteredTx.length} of {accountScopedTransactions.length} transactions
            </p>
            {hasTransactionFilters ? <Badge variant="secondary">Filters active</Badge> : null}
          </div>
        </div>
        <div className="space-y-2">
          {sortedFilteredTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {transactions.length === 0 ? 'No transactions yet.' : 'No transactions match your filters.'}
            </p>
          ) : (
            paginatedTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  {(() => {
                    const transferDestination = tx.transferAccountId
                      ? accounts.find((account) => account.id === tx.transferAccountId)
                      : null;
                    const iconClassName = tx.type === 'income'
                      ? 'bg-success/10 text-success'
                      : tx.type === 'expense'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary';

                    return (
                      <>
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center',
                    iconClassName
                  )}>
                    {tx.type === 'income'
                      ? <ArrowDownRight className="h-4 w-4" />
                      : tx.type === 'expense'
                        ? <ArrowUpRight className="h-4 w-4" />
                        : <ArrowLeftRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.type === 'transfer' && transferDestination
                        ? `${tx.description || 'Transfer'} to ${transferDestination.name}`
                        : tx.description || tx.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(tx.categories?.length ? tx.categories : [tx.category]).map((category, index) => (
                        <span key={`${tx.id}-${category}`} className="inline-flex items-center">
                          {index > 0 ? <span className="mx-1">·</span> : null}
                          <span
                            className="mr-1 inline-flex h-2 w-2 rounded-full"
                            style={{ backgroundColor: getCategoryColor(category, categoryColors, index) }}
                          />
                          {category}
                        </span>
                      ))} · {tx.date}
                    </p>
                    {tx.type === 'transfer' && transferDestination ? (
                      <p className="text-[11px] text-muted-foreground">From {accounts.find((account) => account.id === tx.accountId)?.name ?? 'Unknown'} to {transferDestination.name}</p>
                    ) : null}
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tx.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  {tx.recurringRuleId ? <Badge variant="secondary">Recurring</Badge> : null}
                  {tx.type === 'transfer' ? <Badge variant="outline">Transfer</Badge> : null}
                  <p className={cn('text-sm font-semibold', tx.type === 'income' ? 'text-success' : tx.type === 'expense' ? 'text-destructive' : 'text-primary')}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{currency}{tx.amount.toFixed(2)}
                  </p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEditTransaction(tx.id)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setPendingDelete({ type: 'transaction', id: tx.id, label: tx.description || tx.category })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        {sortedFilteredTx.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {pageStartIndex}-{pageEndIndex} of {sortedFilteredTx.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTxPage((page) => Math.max(1, page - 1))}
                disabled={currentTxPage === 1}
              >
                Previous
              </Button>
              <Badge variant="outline">Page {currentTxPage} of {totalTransactionPages}</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTxPage((page) => Math.min(totalTransactionPages, page + 1))}
                disabled={currentTxPage === totalTransactionPages}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={
          pendingDelete?.type === 'account'
            ? 'Delete account?'
            : pendingDelete?.type === 'transaction'
              ? 'Delete transaction?'
              : 'Delete recurring rule?'
        }
        description={
          pendingDelete
            ? `Are you sure you want to delete ${pendingDelete.type} "${pendingDelete.label}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmPendingDelete}
      />
    </div>
  );
}
