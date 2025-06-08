import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { MessagesPanel } from "@/components/dashboard/messages-panel";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { AISuggestions } from "@/components/dashboard/ai-suggestions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomerWidget } from "@/components/widget/customer-widget";
import { Plus, User } from "lucide-react";

export default function Dashboard() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">CleanFlow</h1>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                <a href="#dashboard" className="text-blue-600 font-medium">Dashboard</a>
                <a href="#leads" className="text-gray-600 hover:text-blue-600">Leads</a>
                <a href="#calendar" className="text-gray-600 hover:text-blue-600">Calendar</a>
                <a href="#messages" className="text-gray-600 hover:text-blue-600">Messages</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={isWidgetOpen} onOpenChange={setIsWidgetOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 text-white hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Customer Lead Capture</DialogTitle>
                  </DialogHeader>
                  <CustomerWidget onSuccess={() => setIsWidgetOpen(false)} />
                </DialogContent>
              </Dialog>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium">Admin User</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Dashboard Overview */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
            <StatsCards />
          </div>

          {/* AI Suggestions */}
          <div className="mb-8">
            <AISuggestions />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <LeadsTable />
            <MessagesPanel />
          </div>

          {/* Calendar Section */}
          <CalendarView />
        </main>
      </div>
    </div>
  );
}
