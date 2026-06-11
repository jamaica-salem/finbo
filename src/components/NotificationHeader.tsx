import { useFinanceStore } from '@/store/financeStore';
import { useAmountPrivacyStore } from '@/store/amountPrivacyStore';
import { formatMoney } from '@/lib/money';
import { AlertCircle, Bell, CircleUserRound, Clock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function NotificationHeader() {
  const { bills, loans, creditCards, currency, nickname, setNickname } = useFinanceStore();
  const amountsHidden = useAmountPrivacyStore((state) => state.amountsHidden);
  const toggleAmountsHidden = useAmountPrivacyStore((state) => state.toggleAmountsHidden);
  const [open, setOpen] = useState(false);
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(nickname || '');

  const handleSaveNickname = () => {
    const next = nicknameDraft.trim();
    if (!next) {
      toast.error('Nickname cannot be empty');
      return;
    }
    setNickname(next);
    setShowEditNickname(false);
    toast.success('Nickname updated');
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDueTime = (dateStr: string) => {
    const time = new Date(`${dateStr}T00:00:00`).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  };

  // Overdue bills (pending/overdue status before today)
  const overdueBills = bills.filter(
    (b) => b.status === 'overdue' || (b.status === 'pending' && getDueTime(b.dueDate) < today.getTime())
  );

  // Upcoming bills (due within 7 days and not past due)
  const upcomingBills = bills.filter((b) => {
    const dueTime = getDueTime(b.dueDate);
    const sevenDaysFromNow = today.getTime() + 7 * 24 * 60 * 60 * 1000;
    return b.status !== 'paid' && dueTime >= today.getTime() && dueTime <= sevenDaysFromNow;
  });

  // Overdue loan payments (any unpaid with schedule entry due before today)
  const overdueLoans = loans.filter((loan) => {
    if (loan.repaymentSchedule.length === 0) return false;
    const nextDue = loan.repaymentSchedule.find((entry) => entry.paidAmount < entry.amount);
    return nextDue && getDueTime(nextDue.dueDate) < today.getTime();
  });

  // Upcoming loan payments (due within 7 days)
  const upcomingLoans = loans.filter((loan) => {
    if (loan.repaymentSchedule.length === 0) return false;
    const nextDue = loan.repaymentSchedule.find((entry) => entry.paidAmount < entry.amount);
    if (!nextDue) return false;
    const dueTime = getDueTime(nextDue.dueDate);
    const sevenDaysFromNow = today.getTime() + 7 * 24 * 60 * 60 * 1000;
    return dueTime >= today.getTime() && dueTime < sevenDaysFromNow;
  });

  // Overdue credit card payments
  const overdueCards = creditCards.filter((card) => {
    if (!card.dueDate) return false;
    return card.currentBalance > 0 && getDueTime(card.dueDate) < today.getTime();
  });

  // Upcoming credit card payments (due within 7 days)
  const upcomingCards = creditCards.filter((card) => {
    if (!card.dueDate || card.currentBalance <= 0) return false;
    const dueTime = getDueTime(card.dueDate);
    const sevenDaysFromNow = today.getTime() + 7 * 24 * 60 * 60 * 1000;
    return dueTime >= today.getTime() && dueTime < sevenDaysFromNow;
  });

  const totalOverdue = overdueBills.length + overdueLoans.length + overdueCards.length;
  const totalUpcoming = upcomingBills.length + upcomingLoans.length + upcomingCards.length;
  const totalNotifications = totalOverdue + totalUpcoming;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm px-8 py-3">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            {totalOverdue > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/30">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {totalOverdue} overdue
                </span>
              </div>
            )}
            {totalUpcoming > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/30">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">
                  {totalUpcoming} due in 7 days
                </span>
              </div>
            )}
            {totalOverdue === 0 && totalUpcoming === 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
                <span className="text-sm font-medium text-success">
                  ✓ All clear
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAmountsHidden}
              aria-pressed={amountsHidden}
              aria-label={amountsHidden ? 'Show amounts' : 'Hide amounts'}
              title={amountsHidden ? 'Show amounts' : 'Hide amounts'}
            >
              {amountsHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              <span className="sr-only">{amountsHidden ? 'Show amounts' : 'Hide amounts'}</span>
            </Button>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {totalNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
                    {totalNotifications > 99 ? '99+' : totalNotifications}
                  </span>
                )}
                <span className="sr-only">Open notifications</span>
              </Button>
            </DialogTrigger>

            <Dialog open={showEditNickname} onOpenChange={(nextOpen) => {
              setShowEditNickname(nextOpen);
              if (nextOpen) setNicknameDraft(nickname || '');
            }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open profile menu">
                    <CircleUserRound className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => setShowEditNickname(true)}>
                    Edit nickname
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit nickname</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nickname</Label>
                    <Input
                      value={nicknameDraft}
                      onChange={(e) => setNicknameDraft(e.target.value)}
                      placeholder="Enter nickname"
                      maxLength={30}
                    />
                  </div>
                  <Button className="w-full" onClick={handleSaveNickname}>Save nickname</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <DialogContent className="max-w-2xl pr-4">
        <DialogHeader>
          <DialogTitle>Upcoming & Overdue Items</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-6 pb-4">
          {/* Overdue Bills */}
          {overdueBills.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue Bills ({overdueBills.length})
              </h4>
              <div className="space-y-1 pl-6">
                {overdueBills.map((b) => (
                  <div key={b.id} className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-destructive">{formatMoney(currency, b.amount, amountsHidden)}</p>
                      <p className="text-xs text-muted-foreground">Due: {b.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Loans */}
          {overdueLoans.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue Loan Payments ({overdueLoans.length})
              </h4>
              <div className="space-y-1 pl-6">
                {overdueLoans.map((loan) => {
                  const nextEntry = loan.repaymentSchedule.find((e) => e.paidAmount < e.amount);
                  return (
                    <div key={loan.id} className="flex justify-between items-start text-sm">
                      <div>
                        <p className="font-medium">{loan.name}</p>
                        <p className="text-xs text-muted-foreground">Payment #{loan.repaymentSchedule.indexOf(nextEntry!) + 1}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-destructive">{formatMoney(currency, nextEntry!.amount, amountsHidden)}</p>
                        <p className="text-xs text-muted-foreground">Due: {nextEntry!.dueDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overdue Credit Cards */}
          {overdueCards.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue Credit Card Payments ({overdueCards.length})
              </h4>
              <div className="space-y-1 pl-6">
                {overdueCards.map((card) => (
                  <div key={card.id} className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-medium">{card.name}</p>
                      <p className="text-xs text-muted-foreground">{card.issuer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-destructive">{formatMoney(currency, card.currentBalance, amountsHidden)}</p>
                      <p className="text-xs text-muted-foreground">Due: {card.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Bills */}
          {upcomingBills.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-warning flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Bills ({upcomingBills.length})
              </h4>
              <div className="space-y-1 pl-6">
                {upcomingBills.map((b) => (
                  <div key={b.id} className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(currency, b.amount, amountsHidden)}</p>
                      <p className="text-xs text-muted-foreground">Due: {b.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Loans */}
          {upcomingLoans.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-warning flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Loan Payments ({upcomingLoans.length})
              </h4>
              <div className="space-y-1 pl-6">
                {upcomingLoans.map((loan) => {
                  const nextEntry = loan.repaymentSchedule.find((e) => e.paidAmount < e.amount);
                  return (
                    <div key={loan.id} className="flex justify-between items-start text-sm">
                      <div>
                        <p className="font-medium">{loan.name}</p>
                        <p className="text-xs text-muted-foreground">Payment #{loan.repaymentSchedule.indexOf(nextEntry!) + 1}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatMoney(currency, nextEntry!.amount, amountsHidden)}</p>
                        <p className="text-xs text-muted-foreground">Due: {nextEntry!.dueDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Credit Cards */}
          {upcomingCards.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-warning flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Credit Card Payments ({upcomingCards.length})
              </h4>
              <div className="space-y-1 pl-6">
                {upcomingCards.map((card) => (
                  <div key={card.id} className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-medium">{card.name}</p>
                      <p className="text-xs text-muted-foreground">{card.issuer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(currency, card.currentBalance, amountsHidden)}</p>
                      <p className="text-xs text-muted-foreground">Due: {card.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
