import { StatsCards } from "@/components/dashboard/stats-cards";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { MessagesPanel } from "@/components/dashboard/messages-panel";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { AISuggestions } from "@/components/dashboard/ai-suggestions";
import { OnboardingOverlay } from "@/components/onboarding-overlay";

export default function Dashboard() {
  return (
    <>
      <div className="p-6">
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
      </div>
      
      {/* Onboarding overlay for users who haven't completed organization setup */}
      <OnboardingOverlay />
    </>
  );
}
