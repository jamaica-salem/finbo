import { NavLink as RouterNavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, TrendingDown, Receipt, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/loans', label: 'Loans', icon: TrendingDown },
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

import { useFinanceStore } from '@/store/financeStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AppSidebar() {
  const { currency, setCurrency } = useFinanceStore();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-30">
      <div className="p-6 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
          <span className="text-primary">Fin</span>bo
        </h1>
        <ThemeToggle />
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <RouterNavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </RouterNavLink>
        ))}
      </nav>
      <div className="p-4 mx-3 mb-4 space-y-4">
        <div className="rounded-lg bg-accent/50 border border-border p-3">
          <p className="text-xs font-medium text-accent-foreground">Currency</p>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-8 mt-2 text-xs">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="₱">PHP (₱)</SelectItem>
              <SelectItem value="$">USD ($)</SelectItem>
              <SelectItem value="€">EUR (€)</SelectItem>
              <SelectItem value="£">GBP (£)</SelectItem>
              <SelectItem value="¥">JPY (¥)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg bg-accent/50 border border-border p-3">
          <p className="text-xs font-medium text-accent-foreground">Pro Tip</p>
          <p className="text-xs text-muted-foreground mt-1">Track every expense to build better habits.</p>
        </div>
      </div>
    </aside>
  );
}
