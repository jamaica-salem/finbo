import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { SecurityGate } from "@/components/SecurityGate";
import { useEffect } from "react";
import { toast } from "sonner";
import { useFinanceStore } from "@/store/financeStore";
import { useAmountPrivacyStore } from "@/store/amountPrivacyStore";
import Dashboard from "./pages/Dashboard";
import AccountsPage from "./pages/AccountsPage";
import LoansPage from "./pages/LoansPage";
import DebtsPage from "./pages/DebtsPage";
import CreditsPage from "./pages/CreditsPage";
import BillsPage from "./pages/BillsPage";
import BudgetPage from "./pages/BudgetPage";
import CategoriesPage from "./pages/CategoriesPage";
import SavingsGoalsPage from "./pages/SavingsGoalsPage";
import SecurityPage from "./pages/SecurityPage";
import OnboardingPage from "./pages/OnboardingPage";
import SupportPage from "./pages/SupportPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import WelcomePage from "./pages/WelcomePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function HomeRoute() {
  const nickname = useFinanceStore((state) => state.nickname);
  if (!nickname?.trim()) {
    return <Navigate to="/welcome" replace />;
  }
  return <Dashboard />;
}

function WelcomeRoute() {
  const nickname = useFinanceStore((state) => state.nickname);
  if (nickname?.trim()) {
    return <Navigate to="/" replace />;
  }
  return <WelcomePage />;
}

function RequireNickname({ children }: { children: React.ReactNode }) {
  const nickname = useFinanceStore((state) => state.nickname);
  if (!nickname?.trim()) {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
}

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
  const amountsHidden = useAmountPrivacyStore((state) => state.amountsHidden);

  useEffect(() => {
    const alerts = checkBudgetAlerts();
    alerts.forEach((alert) => {
      const amount = amountsHidden ? '*****' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(alert.spent);
      const limit = amountsHidden ? '*****' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(alert.limitAmount);
      if (alert.severity === 'over') {
        toast.error(`Budget exceeded: ${alert.category} is now ${amount} of ${limit}.`);
      } else {
        toast.warning(`Budget warning: ${alert.category} has reached ${Math.round(alert.thresholdPct)}% of its limit.`);
      }
    });
  }, [amountsHidden, budgets, checkBudgetAlerts, transactions]);

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
          <Routes>
            <Route path="/welcome" element={<WelcomeRoute />} />
            <Route
              path="*"
              element={(
                <RequireNickname>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<HomeRoute />} />
                      <Route path="/accounts" element={<AccountsPage />} />
                      <Route path="/loans" element={<LoansPage />} />
                      <Route path="/debts" element={<DebtsPage />} />
                      <Route path="/credits" element={<CreditsPage />} />
                      <Route path="/bills" element={<BillsPage />} />
                      <Route path="/budget" element={<BudgetPage />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route path="/savings" element={<SavingsGoalsPage />} />
                      <Route path="/security" element={<SecurityPage />} />
                      <Route path="/onboarding" element={<OnboardingPage />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </RequireNickname>
              )}
            />
          </Routes>
        </SecurityGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
