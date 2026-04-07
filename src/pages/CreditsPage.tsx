import { useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '@/store/financeStore';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Trash2, CreditCard, Pencil, ArrowDownLeft, ArrowUpRight, PhilippinePeso, Wallet, Percent, CalendarClock, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { type CreditCard as CreditCardType } from '@/types/finance';
import { getCreditCardTotalWithInterest } from '@/lib/interest';

const networkLabels: Record<CreditCardType['network'], string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  other: 'Other',
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const formatCurrency = (currency: string, amount: number) => `${currency}${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function CreditsPage() {
  const {
    creditCards,
    creditCardActivities,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    logCreditCardPayment,
    logCreditCardPurchase,
    currency,
  } = useFinanceStore();

  const [showAdd, setShowAdd] = useState(false);
  const [payCardId, setPayCardId] = useState<string | null>(null);
  const [chargeCardId, setChargeCardId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentNote, setPaymentNote] = useState('');
  const [chargeAmount, setChargeAmount] = useState('0');
  const [chargeNote, setChargeNote] = useState('');

  // Add form
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [network, setNetwork] = useState<CreditCardType['network']>('visa');
  const [creditLimit, setCreditLimit] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [currentBalance, setCurrentBalance] = useState('0');
  const [statementBalance, setStatementBalance] = useState('0');
  const [minimumPayment, setMinimumPayment] = useState('0');
  const [monthlyInterestRate, setMonthlyInterestRate] = useState('0');
  const [rewardsRate, setRewardsRate] = useState('0');
  const [annualFee, setAnnualFee] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [statementCloseDate, setStatementCloseDate] = useState('');
  const [openedDate, setOpenedDate] = useState('');
  const [autopay, setAutopay] = useState(false);

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIssuer, setEditIssuer] = useState('');
  const [editNetwork, setEditNetwork] = useState<CreditCardType['network']>('visa');
  const [editCreditLimit, setEditCreditLimit] = useState('0');
  const [editPaidAmount, setEditPaidAmount] = useState('0');
  const [editCurrentBalance, setEditCurrentBalance] = useState('0');
  const [editStatementBalance, setEditStatementBalance] = useState('0');
  const [editMinimumPayment, setEditMinimumPayment] = useState('0');
  const [editMonthlyInterestRate, setEditMonthlyInterestRate] = useState('0');
  const [editRewardsRate, setEditRewardsRate] = useState('0');
  const [editAnnualFee, setEditAnnualFee] = useState('0');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatementCloseDate, setEditStatementCloseDate] = useState('');
  const [editOpenedDate, setEditOpenedDate] = useState('');
  const [editAutopay, setEditAutopay] = useState(false);
  const [editRewardsPoints, setEditRewardsPoints] = useState('0');
  const [addErrors, setAddErrors] = useState<{ name?: string; issuer?: string; creditLimit?: string }>({});
  const [editErrors, setEditErrors] = useState<{ name?: string; issuer?: string; creditLimit?: string }>({});
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

  const totalLimit = creditCards.reduce((sum, card) => sum + card.creditLimit, 0);
  const totalBalance = creditCards.reduce((sum, card) => sum + card.currentBalance, 0);
  const totalMinimumDue = creditCards.reduce((sum, card) => sum + card.minimumPayment, 0);
  const totalRewardsPoints = creditCards.reduce((sum, card) => sum + card.rewardsPoints, 0);
  const utilizationPct = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;

  const openEdit = (id: string) => {
    const card = creditCards.find((item) => item.id === id);
    if (!card) return;

    setEditId(id);
    setEditName(card.name);
    setEditIssuer(card.issuer);
    setEditNetwork(card.network);
    setEditCreditLimit(String(card.creditLimit));
    setEditPaidAmount(String(card.paidAmount));
    setEditCurrentBalance(String(card.currentBalance));
    setEditStatementBalance(String(card.statementBalance));
    setEditMinimumPayment(String(card.minimumPayment));
    setEditMonthlyInterestRate(String(card.monthlyInterestRate));
    setEditRewardsRate(String(card.rewardsRate));
    setEditAnnualFee(String(card.annualFee));
    setEditDueDate(card.dueDate);
    setEditStatementCloseDate(card.statementCloseDate);
    setEditOpenedDate(card.openedDate);
    setEditAutopay(card.autopay);
    setEditRewardsPoints(String(card.rewardsPoints));
    setEditErrors({});
  };

  const resetAddForm = () => {
    setName('');
    setIssuer('');
    setNetwork('visa');
    setCreditLimit('0');
    setPaidAmount('0');
    setCurrentBalance('0');
    setStatementBalance('0');
    setMinimumPayment('0');
    setMonthlyInterestRate('0');
    setRewardsRate('0');
    setAnnualFee('0');
    setDueDate('');
    setStatementCloseDate('');
    setOpenedDate('');
    setAutopay(false);
    setAddErrors({});
  };

  const handleAdd = () => {
    setAddErrors({});
    const errors: typeof addErrors = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!issuer.trim()) errors.issuer = 'Issuer is required';
    if (!(parseFloat(creditLimit) > 0)) errors.creditLimit = 'Credit limit must be greater than 0';
    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    const limit = parseFloat(creditLimit) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const current = parseFloat(currentBalance) || 0;
    const statement = parseFloat(statementBalance) || 0;

    addCreditCard({
      name: name.trim(),
      issuer: issuer.trim(),
      network,
      creditLimit: limit,
      paidAmount: paid,
      currentBalance: current,
      statementBalance: statement,
      minimumPayment: parseFloat(minimumPayment) || 0,
      monthlyInterestRate: parseFloat(monthlyInterestRate) || 0,
      rewardsRate: parseFloat(rewardsRate) || 0,
      annualFee: parseFloat(annualFee) || 0,
      dueDate,
      statementCloseDate,
      openedDate,
      autopay,
      rewardsPoints: 0,
    });

    resetAddForm();
    setShowAdd(false);
  };

  const handleEdit = () => {
    setEditErrors({});
    const errors: typeof editErrors = {};
    if (!editId) return;
    if (!editName.trim()) errors.name = 'Name is required';
    if (!editIssuer.trim()) errors.issuer = 'Issuer is required';
    if (!(parseFloat(editCreditLimit) > 0)) errors.creditLimit = 'Credit limit must be greater than 0';
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }

    updateCreditCard(editId, {
      name: editName.trim(),
      issuer: editIssuer.trim(),
      network: editNetwork,
      creditLimit: parseFloat(editCreditLimit) || 0,
      paidAmount: parseFloat(editPaidAmount) || 0,
      currentBalance: parseFloat(editCurrentBalance) || 0,
      statementBalance: parseFloat(editStatementBalance) || 0,
      minimumPayment: parseFloat(editMinimumPayment) || 0,
      monthlyInterestRate: parseFloat(editMonthlyInterestRate) || 0,
      rewardsRate: parseFloat(editRewardsRate) || 0,
      annualFee: parseFloat(editAnnualFee) || 0,
      dueDate: editDueDate,
      statementCloseDate: editStatementCloseDate,
      openedDate: editOpenedDate,
      autopay: editAutopay,
      rewardsPoints: parseFloat(editRewardsPoints) || 0,
    });

    setEditId(null);
  };

  const handlePayment = () => {
    if (!payCardId || !paymentAmount) return;
    logCreditCardPayment(payCardId, parseFloat(paymentAmount), paymentNote || undefined);
    setPaymentAmount('');
    setPaymentNote('');
    setPayCardId(null);
  };

  const handleCharge = () => {
    if (!chargeCardId || !chargeAmount) return;
    logCreditCardPurchase(chargeCardId, parseFloat(chargeAmount), chargeNote || undefined);
    setChargeAmount('');
    setChargeNote('');
    setChargeCardId(null);
  };

  const handleDeleteCard = (cardId: string) => {
    const card = creditCards.find((item) => item.id === cardId);
    if (!card) return;
    setPendingDelete({ id: cardId, label: card.name });
  };

  const confirmDeleteCard = () => {
    if (!pendingDelete) return;
    deleteCreditCard(pendingDelete.id);
    setPendingDelete(null);
  };

  const renderCard = (card: CreditCardType) => {
    const totalDue = getCreditCardTotalWithInterest(card);
    const utilization = totalDue > 0 ? Math.min(100, Math.round((card.paidAmount / totalDue) * 100)) : 0;
    const available = card.creditLimit - card.currentBalance;
    const utilizationTone = utilization >= 80 ? 'text-destructive' : utilization >= 50 ? 'text-warning' : 'text-success';
    const utilizationLabel = utilization >= 80 ? 'High' : utilization >= 50 ? 'Watch' : 'Healthy';

    return (
      <div key={card.id} className="glass-card rounded-xl p-5 animate-fade-in">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading font-semibold text-foreground">{card.name}</p>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {networkLabels[card.network]}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide', utilizationTone)}>
                {utilizationLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{card.issuer}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setChargeCardId(card.id)}>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setPayCardId(card.id)}>
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(card.id)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleDeleteCard(card.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment progress</span>
            <span className={cn('font-medium', utilizationTone)}>{utilization}%</span>
          </div>
          <Progress value={utilization} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(currency, card.paidAmount)} paid</span>
            <span>{formatCurrency(currency, totalDue)} total with interest</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              <span>Available credit</span>
            </div>
            <p className="mt-1 font-medium text-foreground">{formatCurrency(currency, Math.max(0, available))}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <PhilippinePeso className="h-3.5 w-3.5" />
              <span>Minimum due</span>
            </div>
            <p className="mt-1 font-medium text-foreground">{formatCurrency(currency, card.minimumPayment)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              <span>Monthly rate</span>
            </div>
            <p className="mt-1 font-medium text-foreground">{card.monthlyInterestRate}%</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ReceiptText className="h-3.5 w-3.5" />
              <span>Rewards</span>
            </div>
            <p className="mt-1 font-medium text-foreground">{card.rewardsPoints.toLocaleString()} pts</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Due date</span>
            <p className="font-medium text-foreground">{formatDate(card.dueDate)}</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Statement close</span>
            <p className="font-medium text-foreground">{formatDate(card.statementCloseDate)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Rewards rate</span>
            <p className="font-medium text-foreground">{card.rewardsRate}%</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Autopay</span>
            <p className="font-medium text-foreground">{card.autopay ? 'On' : 'Off'}</p>
          </div>
        </div>
      </div>
    );
  };

  const recentActivity = creditCardActivities.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credits"
        description="Track credit cards, balances, payments, and rewards"
        actions={
        <Dialog
          open={showAdd}
          onOpenChange={(open) => {
            setShowAdd(open);
            if (!open) setAddErrors({});
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Card</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New Credit Card</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. Everyday Visa" value={name} onChange={(e) => setName(e.target.value)} />
                {addErrors.name ? <p className="text-sm text-destructive">{addErrors.name}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Issuer</Label>
                <Input placeholder="e.g. Finbo Bank" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
                {addErrors.issuer ? <p className="text-sm text-destructive">{addErrors.issuer}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Network</Label>
                <Select value={network} onValueChange={(v) => setNetwork(v as CreditCardType['network'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="amex">American Express</SelectItem>
                    <SelectItem value="discover">Discover</SelectItem>
                    <SelectItem value="jcb">JCB</SelectItem>
                    <SelectItem value="unionpay">UnionPay</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Credit limit</Label>
                <Input placeholder="0.00" type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                {addErrors.creditLimit ? <p className="text-sm text-destructive">{addErrors.creditLimit}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Paid amount</Label>
                <Input placeholder="0.00" type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Current balance</Label>
                <Input placeholder="0.00" type="number" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Statement balance</Label>
                <Input placeholder="Defaults to current balance" type="number" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum payment</Label>
                <Input placeholder="0.00" type="number" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly interest rate %</Label>
                <Input placeholder="0" type="number" value={monthlyInterestRate} onChange={(e) => setMonthlyInterestRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Rewards rate %</Label>
                <Input placeholder="1.5" type="number" value={rewardsRate} onChange={(e) => setRewardsRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Annual fee</Label>
                <Input placeholder="0.00" type="number" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Statement close date</Label>
                <Input type="date" value={statementCloseDate} onChange={(e) => setStatementCloseDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Opened date</Label>
                <Input type="date" value={openedDate} onChange={(e) => setOpenedDate(e.target.value)} />
              </div>
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="text-sm font-medium">Autopay</Label>
                  <p className="text-xs text-muted-foreground">Useful for avoiding missed due dates</p>
                </div>
                <Switch checked={autopay} onCheckedChange={setAutopay} />
              </div>
              <Button className="md:col-span-2 mt-2" onClick={handleAdd}>Create Card</Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Credit Limit"
          value={formatCurrency(currency, totalLimit)}
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          title="Current Balance"
          value={formatCurrency(currency, totalBalance)}
          subtitle={`${utilizationPct}% utilization`}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          title="Minimum Due"
          value={formatCurrency(currency, totalMinimumDue)}
          subtitle="Across all cards"
          icon={<PhilippinePeso className="h-5 w-5" />}
        />
        <StatCard
          title="Rewards Points"
          value={totalRewardsPoints.toLocaleString()}
          subtitle="Total across cards"
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      <Dialog open={!!payCardId} onOpenChange={() => setPayCardId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Payment amount</Label>
              <Input placeholder="0.00" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Statement payment" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </div>
            <Button className="w-full mt-2" onClick={handlePayment}>Apply Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!chargeCardId} onOpenChange={() => setChargeCardId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Purchase</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Purchase amount</Label>
              <Input placeholder="0.00" type="number" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Groceries" value={chargeNote} onChange={(e) => setChargeNote(e.target.value)} />
            </div>
            <Button className="w-full mt-2" onClick={handleCharge}>Add Purchase</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editId}
        onOpenChange={() => {
          setEditId(null);
          setEditErrors({});
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Credit Card</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              {editErrors.name ? <p className="text-sm text-destructive">{editErrors.name}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Issuer</Label>
              <Input value={editIssuer} onChange={(e) => setEditIssuer(e.target.value)} />
              {editErrors.issuer ? <p className="text-sm text-destructive">{editErrors.issuer}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Network</Label>
              <Select value={editNetwork} onValueChange={(v) => setEditNetwork(v as CreditCardType['network'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="amex">American Express</SelectItem>
                  <SelectItem value="discover">Discover</SelectItem>
                  <SelectItem value="jcb">JCB</SelectItem>
                  <SelectItem value="unionpay">UnionPay</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Credit limit</Label>
              <Input type="number" value={editCreditLimit} onChange={(e) => setEditCreditLimit(e.target.value)} />
              {editErrors.creditLimit ? <p className="text-sm text-destructive">{editErrors.creditLimit}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Paid amount</Label>
              <Input type="number" value={editPaidAmount} onChange={(e) => setEditPaidAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Current balance</Label>
              <Input type="number" value={editCurrentBalance} onChange={(e) => setEditCurrentBalance(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Statement balance</Label>
              <Input type="number" value={editStatementBalance} onChange={(e) => setEditStatementBalance(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum payment</Label>
              <Input type="number" value={editMinimumPayment} onChange={(e) => setEditMinimumPayment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly interest rate %</Label>
              <Input type="number" value={editMonthlyInterestRate} onChange={(e) => setEditMonthlyInterestRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rewards rate %</Label>
              <Input type="number" value={editRewardsRate} onChange={(e) => setEditRewardsRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Annual fee</Label>
              <Input type="number" value={editAnnualFee} onChange={(e) => setEditAnnualFee(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Statement close date</Label>
              <Input type="date" value={editStatementCloseDate} onChange={(e) => setEditStatementCloseDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Opened date</Label>
              <Input type="date" value={editOpenedDate} onChange={(e) => setEditOpenedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rewards points</Label>
              <Input type="number" value={editRewardsPoints} onChange={(e) => setEditRewardsPoints(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm font-medium">Autopay</Label>
                <p className="text-xs text-muted-foreground">Keeps the card on schedule</p>
              </div>
              <Switch checked={editAutopay} onCheckedChange={setEditAutopay} />
            </div>
            <Button className="md:col-span-2 mt-2" onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete credit card?"
        description={
          pendingDelete ? `Are you sure you want to delete credit card "${pendingDelete.label}"? This action cannot be undone.` : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDeleteCard}
      />

      {creditCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditCards.map(renderCard)}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No credit cards yet. Add one to start tracking balances and rewards.</p>
        </div>
      )}

      <div className="glass-card rounded-xl p-5">
        <h2 className="font-heading font-semibold text-foreground mb-4">Recent Card Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No card activity logged yet.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => {
              const card = creditCards.find((item) => item.id === activity.cardId);
              return (
                <div key={activity.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center',
                      activity.type === 'payment' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                    )}>
                      {activity.type === 'payment' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activity.type === 'payment' ? 'Payment' : 'Purchase'} {card ? `• ${card.name}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(activity.date)}{activity.note ? ` • ${activity.note}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className={cn('text-sm font-semibold', activity.type === 'payment' ? 'text-success' : 'text-foreground')}>
                    {activity.type === 'payment' ? '-' : '+'}{formatCurrency(currency, activity.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
