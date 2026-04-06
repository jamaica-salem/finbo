import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  const location = useLocation();
  const showSupportPrompt = location.pathname !== '/support';

  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        {showSupportPrompt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Enjoying Finbo? You can{' '}
            <Link to="/support" className="font-medium text-primary hover:underline">
              visit Support
            </Link>{' '}
            anytime if you’d like to help keep it free and growing.
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
