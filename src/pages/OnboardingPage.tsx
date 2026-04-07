import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Wallet, BarChart3, Gift, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
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
  const { currency, replaceFinanceData } = useFinanceStore();
  const [showSampleConfirm, setShowSampleConfirm] = useState(false);

  const handleLoadSampleData = () => {
    replaceFinanceData(generateSampleFinanceData(currency));
    setShowSampleConfirm(false);
    toast.success('Sample data loaded.');
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Try sample data
            </CardTitle>
            <CardDescription>Load a demo set if you want to see Finbo in action without entering everything by hand.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This replaces your current data with a realistic starter set that includes accounts, transactions, budgets, bills, loans, cards, and savings goals.
            </p>
            <Button onClick={() => setShowSampleConfirm(true)}>
              Load sample data
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
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
            <p>
              If you want to remove the sample data and start fresh later, open{' '}
              <Link to="/security" className="font-medium text-primary underline-offset-4 hover:underline">
                Security
              </Link>{' '}
              and use reset data.
            </p>
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
    </div>
  );
}
