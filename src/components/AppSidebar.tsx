import { NavLink as RouterNavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, TrendingDown, Receipt, BarChart3, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { useFinanceStore } from '@/store/financeStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/loans', label: 'Loans', icon: TrendingDown },
  { to: '/credits', label: 'Credits', icon: CreditCard },
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AppSidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) {
  const { currency, setCurrency } = useFinanceStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-30 flex flex-col border-r border-border bg-card transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className={cn('flex items-center gap-3 px-3 py-4', collapsed ? 'justify-center' : 'justify-between')}>
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="Finbo Logo" className="h-10 w-10 rounded-xl" />
          {!collapsed && (
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              <span className="text-primary">Fin</span>bo
            </h1>
          )}
        </div>
        {!collapsed && <ThemeToggle />}
      </div>
      <nav className={cn('flex-1 space-y-1 py-4', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <RouterNavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                'group flex h-11 items-center rounded-xl text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <span className="flex w-5 shrink-0 items-center justify-center">
              <Icon className="h-4 w-4" />
            </span>
            <span
              className={cn(
                'truncate transition-[max-width,opacity] duration-200 ease-in-out',
                collapsed ? 'max-w-0 opacity-0' : 'max-w-[10rem] opacity-100',
              )}
            >
              {label}
            </span>
          </RouterNavLink>
        ))}
      </nav>
      <div className={cn('px-3 pb-4 pt-3', collapsed ? 'space-y-3' : 'space-y-4')}>
        {!collapsed && (
          <div className="space-y-3">
            <div className="rounded-lg bg-accent/50 border border-border p-3">
              <p className="text-xs font-medium text-accent-foreground">Currency</p>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-2 h-8 text-xs">
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
        )}
        <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : 'justify-end mt-1')}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex items-center gap-2 rounded-lg text-muted-foreground transition-colors',
              collapsed ? 'h-10 w-10 justify-center hover:bg-muted hover:text-foreground' : 'px-3 py-2 hover:bg-muted hover:text-foreground',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
