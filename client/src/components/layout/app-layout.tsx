import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="p-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-blue-600">CleanFlow</h1>
            <div className="w-9" /> {/* Spacer for center alignment */}
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}