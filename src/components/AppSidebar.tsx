import { NavLink as RouterNavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, TrendingDown, Receipt, BarChart3, ChevronLeft, ChevronRight, CreditCard, PiggyBank, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { useFinanceStore } from '@/store/financeStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/loans', label: 'Loans', icon: TrendingDown },
  { to: '/credits', label: 'Credits', icon: CreditCard },
  { to: '/savings', label: 'Savings', icon: PiggyBank },
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AppSidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) {
  const { currency, setCurrency } = useFinanceStore();

  return (
    <aside
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      className={cn(
        'fixed left-0 top-0 bottom-0 z-30 flex flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-500',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className={cn('flex items-center gap-3 px-3 py-4 transition-all duration-300 ease-in-out', collapsed ? 'justify-center' : 'justify-between')}>
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="Finbo Logo" className="h-10 w-10 rounded-xl" />
          {!collapsed && (
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground transition-all duration-200 ease-in-out">
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
                'group flex h-11 items-center rounded-xl text-sm font-medium transition-all duration-300 ease-in-out',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <span className="flex w-5 shrink-0 items-center justify-center transition-all duration-300 ease-in-out">
              <Icon className="h-4 w-4" />
            </span>
            <span
              className={cn(
                'truncate overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-in-out',
                collapsed ? 'max-w-0 -translate-x-1 opacity-0' : 'max-w-[10rem] translate-x-0 opacity-100',
              )}
            >
              {label}
            </span>
          </RouterNavLink>
        ))}
      </nav>
      <div className="px-3 pb-6 pt-4">
        <div className="mb-4">
          {!collapsed ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">App settings</p>
              <RouterNavLink
                to="/security"
                title="Security"
                aria-label="Security"
                className={({ isActive }) =>
                  cn(
                    'group flex h-11 items-center rounded-xl text-sm font-medium transition-all duration-300 ease-in-out',
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <span className="flex w-5 shrink-0 items-center justify-center transition-all duration-300 ease-in-out">
                  <Shield className="h-4 w-4" />
                </span>
                <span className="truncate overflow-hidden whitespace-nowrap max-w-[10rem] translate-x-0 opacity-100">
                  Security
                </span>
              </RouterNavLink>
            </div>
          ) : (
            <RouterNavLink
              to="/security"
              title="Security"
              aria-label="Security"
              className={({ isActive }) =>
                cn(
                  'group flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 ease-in-out',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Shield className="h-4 w-4" />
            </RouterNavLink>
          )}
        </div>
        {!collapsed && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-accent/50 p-3 transition-all duration-300 ease-in-out">
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
            <div className="rounded-lg border border-border bg-accent/50 p-3 transition-all duration-300 ease-in-out">
              <p className="text-xs font-medium text-accent-foreground">Pro Tip</p>
              <p className="text-xs text-muted-foreground mt-1">Track every expense to build better habits.</p>
            </div>
          </div>
        )}
        <div className={cn('flex items-center gap-2 transition-all duration-300 ease-in-out', collapsed ? 'justify-center mt-8' : 'justify-end mt-8')}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex items-center gap-2 rounded-lg text-muted-foreground transition-all duration-300 ease-in-out',
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
