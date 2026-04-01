import { AppSidebar } from './AppSidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {!isSidebarOpen && (
          <div className="mb-6 flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 mr-4 bg-card border border-border rounded-md shadow-sm hover:bg-accent text-foreground transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground md:hidden">
              <span className="text-primary">Fin</span>bo
            </h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
