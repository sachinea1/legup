import { DragDropContext, Droppable, Draggable, DropResult, DragStart, DragUpdate } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Trash2, Edit, GripVertical, CalendarPlus } from "lucide-react";
import type { Lead } from "@shared/schema";
import { getStatusTheme, getServiceTypeTheme } from "@/lib/theme";
import { displayPhoneNumber } from "@/lib/phone";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { LeadDetailModal } from "./lead-detail-modal";
import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // CHANGED: Added React Query imports
import { apiRequest } from "@/lib/queryClient"; // CHANGED: Added apiRequest import

interface KanbanViewProps {
  leads: Lead[];
  onUpdateLeadStatus: (id: number, status: string) => void;
  isUpdating: boolean;
  onDeleteLead: (id: number) => void;
  onEditLead?: (lead: Lead) => void;
  onScheduleLead?: (lead: Lead) => void;
  filters?: {
    searchQuery: string;
    highPriorityOnly: boolean;
    dateRange: { from?: Date; to?: Date };
    assignedCleaner: string;
  };
}

export function KanbanView({ leads, onUpdateLeadStatus, isUpdating, onDeleteLead, onEditLead, onScheduleLead, filters }: KanbanViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // CHANGED: Added query client
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; lead?: Lead}>({open: false});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedLeadId: number | null;
    sourceColumn: string | null;
  }>({
    isDragging: false,
    draggedLeadId: null,
    sourceColumn: null,
  });
  
  // Updated status order for the new columns
  const statusOrder = ["new", "contacted", "qualified", "appointment_set", "closed_won"];
  
  // Memoized grouping of leads by status for performance
  const leadsByStatus = useMemo(() => {
    return statusOrder.reduce((acc, status) => {
      acc[status] = leads.filter(lead => lead.status === status);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [leads, statusOrder]);

  // CHANGED: Calendar-style optimistic mutation for status updates
  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/leads/${leadId}/status`, { status });
      return response.json();
    },
    onMutate: async ({ leadId, status }) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/leads"] });

      // Snapshot the previous value
      const previousLeads = queryClient.getQueryData(["/api/leads"]);

      // Optimistically update to new value IMMEDIATELY
      queryClient.setQueryData(["/api/leads"], (old: Lead[] = []) => {
        return old.map(lead => 
          lead.id === leadId 
            ? { ...lead, status }
            : lead
        );
      });

      // Return a context object with the snapshotted value
      return { previousLeads };
    },
    onSuccess: (data) => {
      // Silently update with server response - no toast to reduce lag
      queryClient.setQueryData(["/api/leads"], (old: Lead[] = []) => {
        if (!old) return [data];
        return old.map(lead => lead.id === data.id ? data : lead);
      });
    },
    onError: (err, variables, context) => {
      // If mutation fails, roll back to previous state
      if (context?.previousLeads) {
        queryClient.setQueryData(["/api/leads"], context.previousLeads);
      }
      
      // Refetch on error to ensure we have correct state
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      console.error("Error updating lead status:", err);
      toast({
        title: "Error",
        description: "Failed to update lead status. Changes have been reverted.",
        variant: "destructive",
      });
    },
  });

  // Calculate average time in stage (mock calculation for now)
  const getAverageTimeInStage = (status: string): string => {
    const leadsInStatus = leadsByStatus[status] || [];
    if (leadsInStatus.length === 0) return "0d avg";
    
    // Mock calculation - in real app, would calculate based on status change timestamps
    const avgDays = Math.floor(Math.random() * 7) + 1;
    return `${avgDays}d avg`;
  };

  // Drag event handlers with comprehensive state management
  const handleDragStart = useCallback((start: DragStart) => {
    const leadId = parseInt(start.draggableId.replace('lead-', ''));
    setDragState({
      isDragging: true,
      draggedLeadId: leadId,
      sourceColumn: start.source.droppableId,
    });
    console.log("Drag started:", start);
  }, []);

  const handleDragUpdate = useCallback((update: DragUpdate) => {
    console.log("Drag update:", update);
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // Reset drag state
    setDragState({
      isDragging: false,
      draggedLeadId: null,
      sourceColumn: null,
    });

    console.log("Drag end result:", result);

    // If dropped outside a droppable area
    if (!destination) {
      console.log("No destination - dropped outside");
      toast({
        title: "Drop cancelled",
        description: "Lead returned to original position",
      });
      return;
    }

    // If dropped in the same position, no action needed
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log("Same position - no change needed");
      return;
    }

    // CHANGED: Extract lead ID and parse droppable ID with new format
    const leadId = parseInt(draggableId.replace('lead-', ''));
    const newStatus = destination.droppableId.startsWith('status-') 
      ? destination.droppableId.split('-')[1] 
      : destination.droppableId;
    const sourceStatus = source.droppableId.startsWith('status-')
      ? source.droppableId.split('-')[1]
      : source.droppableId;
    
    console.log("Moving lead:", leadId, "from", sourceStatus, "to", newStatus);
    
    // Find the lead being moved
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
      console.log("Lead not found:", leadId);
      toast({
        title: "Error",
        description: "Lead not found",
        variant: "destructive",
      });
      return;
    }

    // Status labels for user feedback
    const statusLabels = {
      new: "New",
      contacted: "Contacted", 
      qualified: "Qualified",
      appointment_set: "Appointment Set",
      closed_won: "Completed"
    };
    
    // CHANGED: Enforce business rule - "Closed" leads can't move backward
    if (lead.status === "closed_won" && newStatus !== "closed_won") {
      toast({
        title: "Action not allowed",
        description: "Completed leads cannot be moved to previous stages",
        variant: "destructive",
      });
      return;
    }
    
    // CHANGED: Use calendar-style optimistic mutation directly  
    updateLeadStatusMutation.mutate({ leadId, status: newStatus });
  }, [leads, updateLeadStatusMutation, toast]); // CHANGED: Updated dependencies for new mutation

  // Simplified lead card without stage toggle buttons

  // Memoized Lead Card component for performance
  const LeadCard = useMemo(() => ({ lead, index }: { lead: Lead; index: number }) => {
    const serviceTheme = getServiceTypeTheme(lead.serviceType || "regular");
    const isDraggedItem = dragState.draggedLeadId === lead.id;

    return (
      <Draggable 
        draggableId={`lead-${lead.id}`} 
        index={index} 
        isDragDisabled={isUpdating}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`mb-3 select-none transition-all duration-150 relative ${
              snapshot.isDragging 
                ? "scale-105 rotate-1 z-50 opacity-90" 
                : isDraggedItem
                ? "opacity-50"
                : ""
            }`}
            role="listitem"
            aria-grabbed={snapshot.isDragging}
            aria-label={`Lead ${lead.name}. Use spacebar to lift, arrow keys to move, spacebar to drop.`}
          >
            {/* Drag Handle - CHANGED: Large visible handle */}
            <div 
              {...provided.dragHandleProps}
              className={`absolute left-2 top-2 z-20 p-2 rounded-md bg-gray-200 border border-gray-300 shadow-sm hover:bg-gray-300 ${
                snapshot.isDragging ? "cursor-grabbing" : "cursor-grab"
              } transition-all`}
              aria-label="Drag handle"
              onClick={(e) => e.stopPropagation()}
              title="Drag to move"
            >
              <GripVertical className="w-4 h-4 text-gray-700" />
            </div>

            <Card
              onClick={(e) => {
                // CHANGED: Only open modal if not dragging and click wasn't on drag handle
                if (!snapshot.isDragging && !isDraggedItem) {
                  setSelectedLead(lead);
                }
              }}
              className={`relative pl-12 ${
                snapshot.isDragging 
                  ? "shadow-2xl bg-blue-50 border-blue-300 ring-2 ring-blue-200" 
                  : "hover:shadow-md hover:bg-gray-50 hover:border-gray-300"
              } border-l-4 transition-all duration-150 ${
                lead.priority === "urgent" ? "border-l-red-500" :
                lead.priority === "high" ? "border-l-orange-500" :
                "border-l-blue-500"
              }`}
              role="button"
              tabIndex={snapshot.isDragging ? -1 : 0}
            >
              <CardContent className="p-3">
                {/* Header with service type and action buttons */}
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className={`${serviceTheme.color} text-xs`}>
                    {serviceTheme.label}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScheduleLead?.(lead);
                      }}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-green-600 hover:bg-green-50"
                      aria-label="Schedule Job"
                      title="Schedule Job"
                    >
                      <CalendarPlus className="w-3 h-3" />
                    </Button>
                    {onEditLead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLead(lead);
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        aria-label="Edit lead"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialog({open: true, lead});
                      }}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      aria-label="Delete lead"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Lead name and creation date */}
                <div className="mb-2">
                  <h4 className="font-semibold text-sm text-gray-900 capitalize truncate">
                    {lead.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, h:mm a") : "No date"}
                  </p>
                </div>

                {/* Contact info */}
                <div className="space-y-1 mb-3">
                  <a 
                    href={`tel:${lead.phone}`}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-3 h-3" />
                    {displayPhoneNumber(lead.phone)}
                  </a>
                  {lead.email && (
                    <a 
                      href={`mailto:${lead.email}`}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{lead.email}</span>
                    </a>
                  )}
                  {lead.address && (
                    <p className="text-xs text-gray-500 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{lead.address}</span>
                    </p>
                  )}
                </div>

                {/* Service details */}
                {lead.rooms && (
                  <p className="text-xs text-gray-600 mb-2">
                    Rooms: {lead.rooms}
                  </p>
                )}

                {/* Estimated cost */}
                {lead.estimatedCost && (
                  <p className="text-xs font-medium text-green-600 mb-2">
                    Est. Cost: ${lead.estimatedCost}
                  </p>
                )}

                {/* Priority badge */}
                {lead.priority && lead.priority !== "normal" && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      lead.priority === "urgent" ? "border-red-500 text-red-600 bg-red-50" :
                      lead.priority === "high" ? "border-orange-500 text-orange-600 bg-orange-50" :
                      "border-blue-500 text-blue-600 bg-blue-50"
                    }`}
                  >
                    {lead.priority}
                  </Badge>
                )}

              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>
    );
  }, [dragState.draggedLeadId, isUpdating, setSelectedLead]);

  const KanbanColumn = ({ status }: { status: string }) => {
    const statusTheme = getStatusTheme(status);
    const columnLeads = leadsByStatus[status] || [];
    
    // Custom labels for the new column structure
    const columnLabels = {
      new: "New",
      contacted: "Contacted",
      qualified: "Qualified", 
      appointment_set: "Appointment Set",
      closed_won: "Completed"
    };

    return (
      <div className="flex-1 min-w-80">
        {/* Column Header */}
        <div className={`p-3 rounded-t-lg border-b-2 ${statusTheme.accent} bg-white`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">
              {columnLabels[status as keyof typeof columnLabels] || statusTheme.label}
            </h3>
            <Badge variant="outline" className={`${statusTheme.color} text-xs`}>
              {columnLeads.length}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            {getAverageTimeInStage(status)}
          </p>
        </div>

        {/* Droppable Column */}
        <Droppable droppableId={`status-${status}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 min-h-96 rounded-b-lg border-2 border-t-0 transition-all duration-200 ${
                snapshot.isDraggingOver 
                  ? "bg-blue-50 border-blue-300 ring-2 ring-blue-100" 
                  : dragState.isDragging
                  ? "bg-gray-100 border-gray-300"
                  : "bg-gray-50 border-gray-200"
              }`}
              role="listbox"
              aria-label={`${getStatusTheme(status).label} stage`}
            >
              {columnLeads.map((lead, index) => (
                <LeadCard key={`lead-${lead.id}`} lead={lead} index={index} />
              ))}
              {provided.placeholder}
              
              {/* Enhanced empty state with drag hint */}
              {columnLeads.length === 0 && (
                <div className={`text-center py-12 transition-all duration-200 ${
                  snapshot.isDraggingOver 
                    ? "border-2 border-dashed border-blue-300 bg-blue-25 rounded-lg" 
                    : dragState.isDragging
                    ? "border-2 border-dashed border-gray-300 bg-gray-25 rounded-lg"
                    : ""
                }`}>
                  <p className="text-gray-400 text-sm font-medium">No leads in this stage</p>
                  <p className="text-gray-300 text-xs mt-1">
                    {dragState.isDragging ? "Drop lead here" : "Drag leads here to change stage"}
                  </p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  return (
    <div className="h-full">
      <DragDropContext 
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDragUpdate={handleDragUpdate}
      >
        {/* Desktop View */}
        <div className="hidden lg:flex gap-4 overflow-x-auto pb-4">
          {statusOrder.map(status => (
            <KanbanColumn key={status} status={status} />
          ))}
        </div>

        {/* Mobile View - Single Column with Swipe */}
        <div className="lg:hidden">
          <div className="mb-4">
            <select 
              className="w-full p-2 border border-gray-200 rounded-lg"
              onChange={(e) => {
                const element = document.getElementById(`column-${e.target.value}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {statusOrder.map(status => (
                <option key={status} value={status}>
                  {getStatusTheme(status).label} ({leadsByStatus[status]?.length || 0})
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-6">
            {statusOrder.map(status => (
              <div key={status} id={`column-${status}`}>
                <KanbanColumn status={status} />
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({open})}
        onConfirm={() => {
          if (deleteDialog.lead) {
            onDeleteLead(deleteDialog.lead.id);
            setDeleteDialog({open: false});
          }
        }}
        leadName={deleteDialog.lead?.name || ""}
      />

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead || undefined}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onUpdateLeadStatus={(id, status) => {
          onUpdateLeadStatus(id, status);
          if (selectedLead && selectedLead.id === id) {
            setSelectedLead({ ...selectedLead, status });
          }
        }}
        onDeleteLead={(id) => {
          onDeleteLead(id);
          setSelectedLead(null);
        }}
        isUpdating={isUpdating}
      />
    </div>
  );
}