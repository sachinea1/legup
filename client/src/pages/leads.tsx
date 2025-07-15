import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Lead, InsertLead } from "@shared/schema";
import { useLeads } from "@/hooks/use-leads";
import { TopNav } from "@/components/leads/top-nav";
import { Filters } from "@/components/leads/filters";
import { ListView } from "@/components/leads/list-view";
import { KanbanView } from "@/components/leads/kanban-view";
import { NewLeadForm } from "@/components/leads/new-lead-form";
import { OnboardingOverlay } from "@/components/onboarding-overlay";

export default function Leads() {
  // View mode state
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  
  // Dialog state
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);

  // Use leads hook for data management
  const { leads, isLoading, updateLeadStatus, createLead, isUpdating, isCreating } = useLeads();

  // Filter leads based on all criteria
  const filteredLeads = Array.isArray(leads) ? leads.filter((lead: Lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
    const matchesService = serviceFilter === "all" || lead.serviceType === serviceFilter;
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    
    return matchesSearch && matchesPriority && matchesService && matchesSource;
  }) : [];

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
          <TopNav viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Filters */}
        <Filters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          serviceFilter={serviceFilter}
          onServiceChange={setServiceFilter}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          onAddLead={() => setShowNewLeadDialog(true)}
          totalLeads={filteredLeads.length}
        />

        {/* View Content */}
        <div className="min-h-96">
          {viewMode === "list" ? (
            <ListView
              leads={filteredLeads}
              onUpdateLeadStatus={updateLeadStatus}
              isUpdating={isUpdating}
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
      </div>
    </>
  );
}