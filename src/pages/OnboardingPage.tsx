import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Wallet, BarChart3, Folder, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useFinanceStore } from '@/store/financeStore';
import { generateSampleFinanceData } from '@/lib/sampleData';

const steps = [
  {
    title: 'Set up your money',
    description: 'Add accounts first so Finbo can track balances correctly.',
    icon: Wallet,
  },
  {
    title: 'Add transactions',
    description: 'Log income and expenses, then let the app organize the rest.',
    icon: CheckCircle2,
  },
  {
    title: 'Watch the insights',
    description: 'Use budgets, analytics, and savings goals to stay on track.',
    icon: BarChart3,
  },
];

export default function OnboardingPage() {
  const { currency, replaceFinanceData, accounts, transactions, budgets } = useFinanceStore();
  const [showSampleConfirm, setShowSampleConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const hasAccount = accounts.length > 0;
  const hasTransaction = transactions.length > 0;
  const hasBudget = budgets.length > 0;
  const completedCount = Number(hasAccount) + Number(hasTransaction) + Number(hasBudget);
  const progressPct = Math.round((completedCount / 3) * 100);

  const handleLoadSampleData = () => {
    replaceFinanceData(generateSampleFinanceData(currency));
    setShowSampleConfirm(false);
    toast.success('Sample data loaded.');
  };

  const handleRemoveSampleData = () => {
    replaceFinanceData({
      accounts: [],
      transactions: [],
      recurringTransactionRules: [],
      categoryRules: [],
      transactionCategories: [],
      savingsCategories: [],
      sharedCategories: [],
      budgets: [],
      categoryColors: {},
      loans: [],
      loanPayments: [],
      creditCards: [],
      creditCardActivities: [],
      bills: [],
      savingsGoals: [],
      savingsGoalContributions: [],
      currency,
    });
    setShowRemoveConfirm(false);
    toast.success('Sample data removed.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description="A quick walkthrough for new users, plus a sample data option if you want to explore right away."
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Welcome to Finbo</CardTitle>
              <CardDescription>We keep it simple: start small, then let the app do the heavy lifting.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">Accounts first</Badge>
          <Badge variant="secondary">Transactions next</Badge>
          <Badge variant="secondary">Insights after that</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>Complete these to get the most out of Finbo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Setup progress</div>
              <div className="text-sm font-medium">{progressPct}%</div>
            </div>
            <Progress value={progressPct} />

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <div className="text-sm">Add an account</div>
                </div>
                <div>
                  {hasAccount ? (
                    <Badge>Done</Badge>
                  ) : (
                    <Link to="/accounts">
                      <Button size="sm">Add account</Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <div className="text-sm">Log a transaction</div>
                </div>
                <div>
                  {hasTransaction ? (
                    <Badge>Done</Badge>
                  ) : (
                    <Link to="/accounts">
                      <Button size="sm">Add transaction</Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div className="text-sm">Create a budget</div>
                </div>
                <div>
                  {hasBudget ? (
                    <Badge>Done</Badge>
                  ) : (
                    <Link to="/budget">
                      <Button size="sm">Create budget</Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <Card key={title} className={index === 2 ? 'sm:col-span-2' : ''}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  {title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Try sample data
            </CardTitle>
            <CardDescription>Load a demo set if you want to see Finbo in action without entering everything by hand.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This replaces your current data with a realistic starter set that includes accounts, transactions, budgets, bills, loans, cards, and savings goals.
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowSampleConfirm(true)}>
                Load sample data
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="destructive" onClick={() => setShowRemoveConfirm(true)}>
                Remove sample data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What to do next</CardTitle>
            <CardDescription>Here’s the fastest path if you want to start from scratch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Add one account.</p>
            <p>2. Log a few transactions.</p>
            <p>3. Create a budget or savings goal.</p>
            <p>4. Review analytics after a few entries.</p>
            {/* Removed reference to resetting sample data here per design change */}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showSampleConfirm}
        onOpenChange={setShowSampleConfirm}
        title="Load sample data?"
        description="This will replace your current finance data with a sample set for exploring Finbo."
        confirmLabel="Load sample data"
        destructive={false}
        onConfirm={handleLoadSampleData}
      />

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove sample data?"
        description="This will clear all your current finance data."
        confirmLabel="Remove sample data"
        destructive={true}
        onConfirm={handleRemoveSampleData}
      />
    </div>
  );
}
