import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { SecurityGate } from "@/components/SecurityGate";
import Dashboard from "./pages/Dashboard";
import AccountsPage from "./pages/AccountsPage";
import LoansPage from "./pages/LoansPage";
import CreditsPage from "./pages/CreditsPage";
import BillsPage from "./pages/BillsPage";
import SavingsGoalsPage from "./pages/SavingsGoalsPage";
import SecurityPage from "./pages/SecurityPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SecurityGate>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/credits" element={<CreditsPage />} />
              <Route path="/bills" element={<BillsPage />} />
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
