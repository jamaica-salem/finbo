import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { SecurityGate } from "@/components/SecurityGate";
import { useEffect } from "react";
import { toast } from "sonner";
import { useFinanceStore } from "@/store/financeStore";
import Dashboard from "./pages/Dashboard";
import AccountsPage from "./pages/AccountsPage";
import LoansPage from "./pages/LoansPage";
import CreditsPage from "./pages/CreditsPage";
import BillsPage from "./pages/BillsPage";
import BudgetPage from "./pages/BudgetPage";
import SavingsGoalsPage from "./pages/SavingsGoalsPage";
import SecurityPage from "./pages/SecurityPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RecurringTransactionScheduler() {
  const runRecurringTransactionScheduler = useFinanceStore((state) => state.runRecurringTransactionScheduler);

  useEffect(() => {
    runRecurringTransactionScheduler();

    const interval = window.setInterval(() => {
      runRecurringTransactionScheduler();
    }, 5 * 60 * 1000);

    const handleVisibility = () => {
      if (!document.hidden) {
        runRecurringTransactionScheduler();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [runRecurringTransactionScheduler]);

  return null;
}

function BudgetAlertMonitor() {
  const transactions = useFinanceStore((state) => state.transactions);
  const budgets = useFinanceStore((state) => state.budgets);
  const checkBudgetAlerts = useFinanceStore((state) => state.checkBudgetAlerts);

  useEffect(() => {
    const alerts = checkBudgetAlerts();
    alerts.forEach((alert) => {
      const amount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(alert.spent);
      const limit = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(alert.limitAmount);
      if (alert.severity === 'over') {
        toast.error(`Budget exceeded: ${alert.category} is now ${amount} of ${limit}.`);
      } else {
        toast.warning(`Budget warning: ${alert.category} has reached ${Math.round(alert.thresholdPct)}% of its limit.`);
      }
    });
  }, [budgets, checkBudgetAlerts, transactions]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SecurityGate>
          <RecurringTransactionScheduler />
          <BudgetAlertMonitor />
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/credits" element={<CreditsPage />} />
              <Route path="/bills" element={<BillsPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/savings" element={<SavingsGoalsPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </SecurityGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
