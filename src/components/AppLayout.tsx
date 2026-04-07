import { AppSidebar } from './AppSidebar';
import { NotificationHeader } from './NotificationHeader';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const collapsed = isMobile ? true : isSidebarCollapsed;

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar collapsed={collapsed} setCollapsed={setIsSidebarCollapsed} />
      <main
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        className={`flex-1 flex flex-col transition-[margin-left] duration-500 ${collapsed ? 'ml-20' : 'ml-64'}`}
      >
        <NotificationHeader />
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
