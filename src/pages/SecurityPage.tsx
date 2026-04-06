import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { KeyRound, Clock3, TriangleAlert, RotateCcw, CheckCircle2, Download, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFinanceStore } from '@/store/financeStore';
import { clearFinboDeviceData, createPinRecord, isValidPin, verifyPin } from '@/lib/security';
import {
  buildFinanceBackupSnapshot,
  downloadTextFile,
  exportTransactionsCsv,
  normalizeFinanceBackupSnapshot,
  normalizeHeader,
  parseCsvTable,
} from '@/lib/backup';
import { DEFAULT_AUTO_LOCK_MINUTES, useSecurityStore } from '@/store/securityStore';
import type { FinanceBackupSnapshot } from '@/types/finance';

const AUTO_LOCK_OPTIONS = [1, 5, 10, 15, 30, 60];
const CSV_FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'accountName', label: 'Account Name' },
  { key: 'accountId', label: 'Account ID' },
] as const;
type CsvFieldKey = (typeof CSV_FIELDS)[number]['key'];
type CsvMapping = Record<CsvFieldKey, string>;

const DEFAULT_CSV_MAPPING: CsvMapping = {
  date: '',
  amount: '',
  type: '',
  category: '',
  description: '',
  accountName: '',
  accountId: '',
};

const detectHeader = (headers: string[], candidates: string[]) => {
  const normalizedCandidates = candidates.map((candidate) => normalizeHeader(candidate));
  return headers.find((header) => normalizedCandidates.includes(normalizeHeader(header))) ?? '';
};

const sanitizeMoney = (value: string) => Number(value.replace(/[^0-9.-]/g, ''));

const parseTransactionType = (value: string, amount: number, fallback: 'auto' | 'income' | 'expense' = 'auto') => {
  const normalized = normalizeHeader(value);
  if (normalized) {
    if (['income', 'credit', 'deposit', 'in'].includes(normalized)) return 'income' as const;
    if (['expense', 'debit', 'withdrawal', 'withdraw', 'out'].includes(normalized)) return 'expense' as const;
  }
  if (fallback === 'income') return 'income' as const;
  if (fallback === 'expense') return 'expense' as const;
  return amount < 0 ? ('expense' as const) : ('income' as const);
};

const buildCsvMappingFromHeaders = (headers: string[]): CsvMapping => ({
  date: detectHeader(headers, ['date', 'transaction date', 'created at', 'posted date']),
  amount: detectHeader(headers, ['amount', 'value', 'money', 'total']),
  type: detectHeader(headers, ['type', 'transaction type', 'kind']),
  category: detectHeader(headers, ['category', 'tag']),
  description: detectHeader(headers, ['description', 'details', 'memo', 'note', 'merchant', 'payee']),
  accountName: detectHeader(headers, ['account', 'account name', 'wallet', 'source account']),
  accountId: detectHeader(headers, ['account id', 'accountid', 'source account id']),
});

export default function SecurityPage() {
  const finance = useFinanceStore();
  const { pinHash, pinSalt, autoLockMinutes, setAutoLockMinutes, setPinRecord } = useSecurityStore();
  const {
    accounts,
    transactions,
    loans,
    loanPayments,
    creditCards,
    creditCardActivities,
    bills,
    savingsGoals,
    savingsGoalContributions,
    currency,
    addTransaction,
    replaceFinanceData,
  } = finance;
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [customTimeout, setCustomTimeout] = useState(String(autoLockMinutes));
  const hasPin = Boolean(pinHash && pinSalt);
  const [pendingBackup, setPendingBackup] = useState<FinanceBackupSnapshot | null>(null);
  const [pendingBackupName, setPendingBackupName] = useState('');
  const [jsonError, setJsonError] = useState('');
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<CsvMapping>(DEFAULT_CSV_MAPPING);
  const [csvAccountId, setCsvAccountId] = useState(accounts[0]?.id ?? '');
  const [csvTypeMode, setCsvTypeMode] = useState<'auto' | 'income' | 'expense'>('auto');
  const [csvImportError, setCsvImportError] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

  const autoLockLabel = useMemo(() => {
    if (autoLockMinutes === DEFAULT_AUTO_LOCK_MINUTES) return '15 minutes';
    return `${autoLockMinutes} minute${autoLockMinutes === 1 ? '' : 's'}`;
  }, [autoLockMinutes]);

  const availableHeaderOptions = useMemo(() => ['__none__', ...csvHeaders], [csvHeaders]);
  const csvPreviewRows = useMemo(() => csvRows.slice(0, 5), [csvRows]);

  const handleTimeoutChange = (value: string) => {
    if (value === 'custom') {
      const minutes = Math.max(1, parseInt(customTimeout || '1', 10) || 1);
      setAutoLockMinutes(minutes);
      return;
    }

    setAutoLockMinutes(Number(value));
    setCustomTimeout(value);
  };

  const handleCustomTimeoutSave = () => {
    const minutes = Math.max(1, Math.floor(Number(customTimeout)));
    if (!Number.isFinite(minutes) || minutes < 1) {
      toast.error('Enter a valid number of minutes.');
      return;
    }
    setCustomTimeout(String(minutes));
    setAutoLockMinutes(minutes);
    toast.success(`Auto-lock set to ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  };

  useEffect(() => {
    setCustomTimeout(String(autoLockMinutes));
  }, [autoLockMinutes]);

  useEffect(() => {
    if (csvAccountId && accounts.some((account) => account.id === csvAccountId)) return;
    setCsvAccountId(accounts[0]?.id ?? '');
  }, [accounts, csvAccountId]);

  const handleExportJson = () => {
    const snapshot = buildFinanceBackupSnapshot({
      accounts,
      transactions,
      loans,
      loanPayments,
      creditCards,
      creditCardActivities,
      bills,
      savingsGoals,
      savingsGoalContributions,
      currency,
    });
    const exportedAt = snapshot.exportedAt.slice(0, 10);
    downloadTextFile(`finbo-backup-${exportedAt}.json`, JSON.stringify(snapshot, null, 2), 'application/json');
    toast.success('JSON backup downloaded.');
  };

  const handleExportCsv = () => {
    downloadTextFile(
      `finbo-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      exportTransactionsCsv(transactions, accounts),
      'text/csv',
    );
    toast.success('CSV export downloaded.');
  };

  const handleJsonFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setJsonError('');
    try {
      const text = await file.text();
      const parsed = normalizeFinanceBackupSnapshot(JSON.parse(text));
      if (!parsed) {
        throw new Error('That file is not a valid Finbo backup.');
      }
      setPendingBackup(parsed);
      setPendingBackupName(file.name);
    } catch (error) {
      setPendingBackup(null);
      setPendingBackupName('');
      setJsonError(error instanceof Error ? error.message : 'Unable to read backup file.');
      toast.error('Could not read the JSON backup.');
    }
  };

  const handleRestoreBackup = () => {
    if (!pendingBackup) return;
    replaceFinanceData(pendingBackup.data);
    setPendingBackup(null);
    setPendingBackupName('');
    toast.success('Backup restored.');
  };

  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (accounts.length === 0) {
      toast.error('Create at least one account before importing transactions.');
      return;
    }

    setCsvImportError('');
    try {
      const text = await file.text();
      const table = parseCsvTable(text);
      if (table.headers.length === 0 || table.rows.length === 0) {
        throw new Error('CSV file does not contain headers and rows.');
      }

      const mapping = buildCsvMappingFromHeaders(table.headers);
      setCsvFileName(file.name);
      setCsvHeaders(table.headers);
      setCsvRows(table.rows);
      setCsvMapping(mapping);
      setCsvAccountId(accounts[0]?.id ?? '');
      setCsvTypeMode('auto');
      toast.success('CSV loaded. Review the column mapping and import preview.');
    } catch (error) {
      setCsvFileName('');
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvImportError(error instanceof Error ? error.message : 'Unable to read CSV file.');
      toast.error('Could not read the CSV file.');
    }
  };

  const handleCsvImport = () => {
    if (accounts.length === 0) {
      toast.error('Create at least one account before importing transactions.');
      return;
    }

    const defaultAccountId = csvAccountId || accounts[0]?.id;
    if (!defaultAccountId) {
      toast.error('Select a default account for imported transactions.');
      return;
    }

    const dateIndex = csvHeaders.indexOf(csvMapping.date);
    const amountIndex = csvHeaders.indexOf(csvMapping.amount);
    const typeIndex = csvHeaders.indexOf(csvMapping.type);
    const categoryIndex = csvHeaders.indexOf(csvMapping.category);
    const descriptionIndex = csvHeaders.indexOf(csvMapping.description);
    const accountNameIndex = csvHeaders.indexOf(csvMapping.accountName);
    const accountIdIndex = csvHeaders.indexOf(csvMapping.accountId);

    if (dateIndex < 0 || amountIndex < 0) {
      toast.error('Date and amount columns are required.');
      return;
    }

    setCsvImporting(true);
    try {
      let imported = 0;
      csvRows.forEach((row) => {
        const rawDate = row[dateIndex] ?? '';
        const rawAmount = row[amountIndex] ?? '';
        const amount = sanitizeMoney(rawAmount);
        if (!rawDate || Number.isNaN(amount)) return;

        const typeValue = typeIndex >= 0 ? row[typeIndex] ?? '' : '';
        const transactionType = parseTransactionType(typeValue, amount, csvTypeMode);
        const normalizedAmount = Math.abs(amount);
        if (normalizedAmount === 0) return;

        const accountIdValue = accountIdIndex >= 0 ? row[accountIdIndex] ?? '' : '';
        const accountNameValue = accountNameIndex >= 0 ? row[accountNameIndex] ?? '' : '';
        const matchedAccount =
          accounts.find((account) => account.id === accountIdValue) ||
          accounts.find((account) => account.name.toLowerCase() === accountNameValue.toLowerCase()) ||
          accounts.find((account) => account.id === defaultAccountId);

        if (!matchedAccount) return;

        addTransaction({
          accountId: matchedAccount.id,
          type: transactionType,
          amount: normalizedAmount,
          category: categoryIndex >= 0 ? row[categoryIndex] || 'Other' : 'Other',
          description: descriptionIndex >= 0 ? row[descriptionIndex] || 'Imported transaction' : 'Imported transaction',
          date: rawDate,
        });
        imported += 1;
      });

      if (imported === 0) {
        toast.error('No valid transactions were found to import.');
        return;
      }

      setCsvFileName('');
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvMapping(DEFAULT_CSV_MAPPING);
      setCsvAccountId(accounts[0]?.id ?? '');
      setCsvTypeMode('auto');
      toast.success(`Imported ${imported} transaction${imported === 1 ? '' : 's'}.`);
    } finally {
      setCsvImporting(false);
    }
  };

  const handleChangePin = async () => {
    if (!isValidPin(newPin)) {
      toast.error('New PIN must be 4 to 6 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('New PIN confirmation does not match.');
      return;
    }

    setIsSavingPin(true);
    try {
      if (hasPin) {
        if (!isValidPin(currentPin)) {
          toast.error('Current PIN must be 4 to 6 digits.');
          return;
        }

        if (!pinHash || !pinSalt) {
          toast.error('No PIN is currently set.');
          return;
        }

        const valid = await verifyPin(currentPin, pinSalt, pinHash);
        if (!valid) {
          toast.error('Current PIN is incorrect.');
          return;
        }
      }

      const { hash, salt } = await createPinRecord(newPin);
      setPinRecord(hash, salt);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      toast.success('PIN updated.');
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleResetDevice = () => {
    clearFinboDeviceData();
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Security</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your local PIN and auto-lock behavior.</p>
        </div>
      </div>

      <Alert className="border-amber-500/30 bg-amber-500/10">
        <TriangleAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle>Local-only protection</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Your PIN never leaves this device. Finbo stores only a salted SHA-256 hash locally in the browser.
          </p>
          <p>
            Clearing browser storage will erase both the PIN and your saved app data.
          </p>
        </AlertDescription>
      </Alert>

      {!hasPin && (
        <Alert className="border-primary/30 bg-primary/10">
          <AlertTitle>PIN is optional</AlertTitle>
          <AlertDescription>
            You can keep using Finbo normally without a PIN. Set one here any time for extra protection on this
            browser.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {hasPin ? 'Change PIN' : 'Set PIN'}
            </CardTitle>
            <CardDescription>
              {hasPin ? 'Update the PIN on this browser and device.' : 'Protect this browser and device with a PIN.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPin && (
              <div className="space-y-2">
                <Label htmlFor="current-pin">Current PIN</Label>
                <Input
                  id="current-pin"
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value)}
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="Enter current PIN"
                  type="password"
                  maxLength={6}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-pin">{hasPin ? 'New PIN' : 'Create PIN'}</Label>
              <Input
                id="new-pin"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value)}
                inputMode="numeric"
                pattern="\d*"
                placeholder="Enter 4-6 digits"
                type="password"
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-pin">Confirm new PIN</Label>
              <Input
                id="confirm-new-pin"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                inputMode="numeric"
                pattern="\d*"
                placeholder="Re-enter new PIN"
                type="password"
                maxLength={6}
              />
            </div>
            <Button onClick={handleChangePin} disabled={isSavingPin} className="w-full">
              {isSavingPin ? 'Saving PIN...' : hasPin ? 'Save new PIN' : 'Set PIN'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Auto-lock timeout
            </CardTitle>
            <CardDescription>Choose how long Finbo stays unlocked before it asks for your PIN again.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Timeout</Label>
              <Select value={String(autoLockMinutes)} onValueChange={handleTimeoutChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeout" />
                </SelectTrigger>
                <SelectContent>
                  {AUTO_LOCK_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} minute{minutes === 1 ? '' : 's'}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-timeout">Custom minutes</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-timeout"
                  type="number"
                  min={1}
                  step={1}
                  value={customTimeout}
                  onChange={(event) => setCustomTimeout(event.target.value)}
                  placeholder="Enter minutes"
                />
                <Button type="button" variant="outline" onClick={handleCustomTimeoutSave}>
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use any whole number of minutes. We’ll lock after that many minutes of inactivity.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Current timeout: <span className="font-medium text-foreground">{autoLockLabel}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Reset this device
          </CardTitle>
          <CardDescription>Clear the local PIN and app data stored in this browser.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>This is for when you forget the PIN or want to start fresh on this browser.</p>
            <p>It will remove your saved finance data too.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Finbo on this device?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will erase the PIN and all locally stored financial data in this browser. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetDevice}>Reset now</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Backup & restore
          </CardTitle>
          <CardDescription>Export your data manually or restore it from a saved JSON backup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleExportJson}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button type="button" variant="outline" onClick={handleExportCsv}>
              <FileText className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button type="button" variant="outline" onClick={() => jsonInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import JSON
            </Button>
            <Button type="button" variant="outline" onClick={() => csvInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </div>

          <Input ref={jsonInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJsonFileChange} />
          <Input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileChange} />

          <Alert className="border-border bg-muted/30">
            <AlertTitle>Backup contents</AlertTitle>
            <AlertDescription>
              JSON backups include all stored finance data. CSV backups contain transactions only and are best for
              sharing or importing into spreadsheets.
            </AlertDescription>
          </Alert>

          {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
          {csvImportError && <p className="text-sm text-destructive">{csvImportError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            CSV transaction import
          </CardTitle>
          <CardDescription>Load a CSV file, map the columns, and import transactions into your accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => csvInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Choose CSV
            </Button>
            {csvRows.length > 0 && (
              <Button type="button" onClick={handleCsvImport} disabled={csvImporting}>
                {csvImporting ? 'Importing...' : `Import ${csvRows.length} row${csvRows.length === 1 ? '' : 's'}`}
              </Button>
            )}
          </div>

          {csvFileName && (
            <Alert>
              <AlertTitle>Loaded file</AlertTitle>
              <AlertDescription>
                {csvFileName} · {csvRows.length} row{csvRows.length === 1 ? '' : 's'} ready for mapping.
              </AlertDescription>
            </Alert>
          )}

          {csvRows.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {CSV_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>
                      {field.label} {field.required ? <span className="text-destructive">*</span> : null}
                    </Label>
                    <Select
                      value={csvMapping[field.key] || '__none__'}
                      onValueChange={(value) =>
                        setCsvMapping((current) => ({ ...current, [field.key]: value === '__none__' ? '' : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Map ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableHeaderOptions.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header === '__none__' ? 'Not mapped' : header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Default account</Label>
                  <Select value={csvAccountId} onValueChange={setCsvAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type fallback</Label>
                  <Select value={csvTypeMode} onValueChange={(value) => setCsvTypeMode(value as 'auto' | 'income' | 'expense')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Infer from value sign or type column</SelectItem>
                      <SelectItem value="income">Treat unmatched rows as income</SelectItem>
                      <SelectItem value="expense">Treat unmatched rows as expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreviewRows.map((row, index) => {
                      const getMapped = (field: CsvFieldKey) => {
                        const header = csvMapping[field];
                        const headerIndex = csvHeaders.indexOf(header);
                        return headerIndex >= 0 ? row[headerIndex] ?? '' : '';
                      };

                      return (
                        <TableRow key={`${index}-${row.join('-')}`}>
                          <TableCell>{getMapped('date') || '—'}</TableCell>
                          <TableCell>{getMapped('amount') || '—'}</TableCell>
                          <TableCell>{getMapped('type') || '—'}</TableCell>
                          <TableCell>{getMapped('category') || '—'}</TableCell>
                          <TableCell>{getMapped('description') || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingBackup)} onOpenChange={(open) => !open && setPendingBackup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current finance data with the contents of{' '}
              <span className="font-medium text-foreground">{pendingBackupName || 'the selected file'}</span>. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{pendingBackup ? `${pendingBackup.data.accounts.length} accounts, ${pendingBackup.data.transactions.length} transactions` : ''}</p>
            <p>
              {pendingBackup
                ? `${pendingBackup.data.loans.length} loans, ${pendingBackup.data.creditCards.length} credit cards, ${pendingBackup.data.bills.length} bills`
                : ''}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingBackup(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreBackup}>Restore backup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            What this protects
          </CardTitle>
          <CardDescription>Useful reminders about how the local PIN works.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Each browser and device gets its own PIN.</p>
          <p>The PIN is required on launch, after inactivity, and when the tab loses focus.</p>
          <p>Clearing browser storage removes the PIN and the data together.</p>
        </CardContent>
      </Card>
    </div>
  );
}
