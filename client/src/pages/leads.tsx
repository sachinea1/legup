import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Lead, InsertLead } from "@shared/schema";
import { useLeads } from "@/hooks/use-leads";
import { TopNav } from "@/components/leads/top-nav";
import { ListView } from "@/components/leads/list-view";
import { KanbanView } from "@/components/leads/kanban-view";
import { NewLeadForm } from "@/components/leads/new-lead-form";
import { FiltersModal } from "@/components/leads/filters-modal";
import { OnboardingOverlay } from "@/components/onboarding-overlay";

export default function Leads() {
  // View mode state
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  
  // Shared filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [assignedCleaner, setAssignedCleaner] = useState<string>("all");
  
  // Dialog states
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Use leads hook for data management (memoized to prevent refetch on view toggle)
  const { leads, isLoading, updateLeadStatus, createLead, isUpdating, isCreating } = useLeads();

  // Memoized filtered leads to prevent unnecessary recalculations
  const filteredLeads = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    
    return leads.filter((lead: Lead) => {
      // Search filter
      const matchesSearch = !searchQuery || 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // High priority filter
      const matchesPriority = !highPriorityOnly || 
        lead.priority === "high" || lead.priority === "urgent";
      
      // Date range filter
      const matchesDate = !dateRange.from || !dateRange.to || 
        (lead.createdAt && 
         new Date(lead.createdAt) >= dateRange.from && 
         new Date(lead.createdAt) <= dateRange.to);
      
      // Assigned cleaner filter (placeholder - would need cleaner field in schema)
      const matchesCleaner = assignedCleaner === "all"; // Always true for now
      
      return matchesSearch && matchesPriority && matchesDate && matchesCleaner;
    });
  }, [leads, searchQuery, highPriorityOnly, dateRange, assignedCleaner]);

  // Handle creating new lead
  const handleCreateLead = (data: InsertLead) => {
    createLead(data);
    setShowNewLeadDialog(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading leads...</div>
      </div>
    );
  }

  return (
    <>
      <OnboardingOverlay />
      <div className="p-6 space-y-6">
        {/* Header with View Toggle */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Leads Management</h1>
            <p className="text-gray-600 mt-1">
              Manage your sales pipeline with list and kanban views
            </p>
          </div>
          <TopNav 
            viewMode={viewMode} 
            onViewModeChange={setViewMode}
            onOpenFilters={() => setShowFiltersModal(true)}
            onAddLead={() => setShowNewLeadDialog(true)}
          />
        </div>

        {/* Search bar for List View only */}
        {viewMode === "list" && (
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search leads by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Search leads"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <span className="text-sm font-medium text-gray-600">
                {filteredLeads.length} leads
              </span>
            </div>
          </div>
        )}

        {/* View Content */}
        <div className="min-h-96">
          {viewMode === "list" ? (
            <ListView
              leads={filteredLeads}
              onUpdateLeadStatus={updateLeadStatus}
              isUpdating={isUpdating}
              highPriorityOnly={highPriorityOnly}
              onHighPriorityChange={setHighPriorityOnly}
            />
          ) : (
            <KanbanView
              leads={filteredLeads}
              onUpdateLeadStatus={updateLeadStatus}
              isUpdating={isUpdating}
            />
          )}
        </div>

        {/* New Lead Dialog */}
        <Dialog open={showNewLeadDialog} onOpenChange={setShowNewLeadDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Add a new lead to the system manually.
              </DialogDescription>
            </DialogHeader>
            <NewLeadForm onSubmit={handleCreateLead} isLoading={isCreating} />
          </DialogContent>
        </Dialog>

        {/* Filters Modal for Kanban View */}
        <FiltersModal
          open={showFiltersModal}
          onOpenChange={setShowFiltersModal}
          highPriorityOnly={highPriorityOnly}
          onHighPriorityChange={setHighPriorityOnly}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          assignedCleaner={assignedCleaner}
          onAssignedCleanerChange={setAssignedCleaner}
        />
      </div>
    </>
  );
}