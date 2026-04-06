import { AppSidebar } from './AppSidebar';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const collapsed = isMobile ? true : isSidebarCollapsed;

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar collapsed={collapsed} setCollapsed={setIsSidebarCollapsed} />
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  );
}
