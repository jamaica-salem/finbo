import { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Wallet, Building2, Smartphone, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccountType } from '@/types/finance';

const CATEGORIES = ['Salary', 'Freelance', 'Rent', 'Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Health', 'Other'];
const ACCOUNT_ICONS: Record<AccountType, React.ElementType> = { bank: Building2, cash: Wallet, 'e-wallet': Smartphone };

export default function AccountsPage() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount, addTransaction, deleteTransaction, currency } = useFinanceStore();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Edit account
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editAName, setEditAName] = useState('');
  const [editAType, setEditAType] = useState<AccountType>('bank');
  const [editABal, setEditABal] = useState('0');

  // Add account form
  const [aName, setAName] = useState('');
  const [aType, setAType] = useState<AccountType>('bank');
  const [aBal, setABal] = useState('0');

  // Add transaction form
  const [txAccount, setTxAccount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState('0');
  const [txCategory, setTxCategory] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddAccount = () => {
    if (!aName) return;
    addAccount({ name: aName, type: aType, balance: parseFloat(aBal) || 0, currency, color: 'hsl(172, 66%, 40%)' });
    setAName(''); setABal('0'); setShowAddAccount(false);
  };

  const openEditAccount = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    setEditAccountId(id);
    setEditAName(acc.name);
    setEditAType(acc.type);
    setEditABal(String(acc.balance));
  };

  const handleEditAccount = () => {
    if (!editAccountId || !editAName) return;
    updateAccount(editAccountId, { name: editAName, type: editAType, balance: parseFloat(editABal) || 0 });
    setEditAccountId(null);
  };

  const handleAddTx = () => {
    if (!txAccount || !txAmount || !txCategory) return;
    addTransaction({ accountId: txAccount, type: txType, amount: parseFloat(txAmount), category: txCategory, description: txDesc, date: txDate });
    setTxAmount(''); setTxDesc(''); setShowAddTx(false);
  };

  const filteredTx = selectedAccount
    ? transactions.filter((t) => t.accountId === selectedAccount)
    : transactions;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your accounts and transactions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Account name</Label>
                  <Input placeholder="e.g. Main Bank" value={aName} onChange={(e) => setAName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={aType} onValueChange={(v) => setAType(v as AccountType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="e-wallet">E-Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Initial balance</Label>
                  <Input placeholder="0.00" type="number" value={aBal} onChange={(e) => setABal(e.target.value)} />
                </div>
                <Button className="w-full mt-2" onClick={handleAddAccount}>Add Account</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddTx} onOpenChange={setShowAddTx}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Transaction</Button>
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
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction type</Label>
                  <Select value={txType} onValueChange={(v) => setTxType(v as 'income' | 'expense')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input placeholder="0.00" type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={txCategory} onValueChange={setTxCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input placeholder="e.g. Groceries" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
                </div>
                <Button className="w-full mt-2" onClick={handleAddTx}>Add Transaction</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={!!editAccountId} onOpenChange={() => setEditAccountId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input placeholder="e.g. Main Bank" value={editAName} onChange={(e) => setEditAName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editAType} onValueChange={(v) => setEditAType(v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="e-wallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Balance</Label>
              <Input placeholder="0.00" type="number" value={editABal} onChange={(e) => setEditABal(e.target.value)} />
            </div>
            <Button className="w-full mt-2" onClick={handleEditAccount}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    <p className="text-xs text-muted-foreground capitalize">{a.type}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEditAccount(a.id); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); deleteAccount(a.id); }}>
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
        <div className="space-y-2">
          {filteredTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            filteredTx.sort((a, b) => b.date.localeCompare(a.date)).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center',
                    tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  )}>
                    {tx.type === 'income' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tx.description || tx.category}</p>
                    <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-semibold', tx.type === 'income' ? 'text-success' : 'text-destructive')}>
                    {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toFixed(2)}
                  </p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => deleteTransaction(tx.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
