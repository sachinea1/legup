import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Trash2, Edit, GripVertical } from "lucide-react";
import type { Lead } from "@shared/schema";
import { getStatusTheme, getServiceTypeTheme } from "@/lib/theme";
import { displayPhoneNumber } from "@/lib/phone";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { LeadDetailModal } from "./lead-detail-modal";
import { useState } from "react";

interface KanbanViewProps {
  leads: Lead[];
  onUpdateLeadStatus: (id: number, status: string) => void;
  isUpdating: boolean;
  onDeleteLead: (id: number) => void;
  onEditLead?: (lead: Lead) => void;
  filters?: {
    searchQuery: string;
    highPriorityOnly: boolean;
    dateRange: { from?: Date; to?: Date };
    assignedCleaner: string;
  };
}

export function KanbanView({ leads, onUpdateLeadStatus, isUpdating, onDeleteLead, onEditLead, filters }: KanbanViewProps) {
  const { toast } = useToast();
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; lead?: Lead}>({open: false});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Updated status order for the new columns
  const statusOrder = ["new", "contacted", "qualified", "appointment_set", "closed_won"];
  
  // Group leads by status
  const leadsByStatus = statusOrder.reduce((acc, status) => {
    acc[status] = leads.filter(lead => lead.status === status);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Calculate average time in stage (mock calculation for now)
  const getAverageTimeInStage = (status: string): string => {
    const leadsInStatus = leadsByStatus[status] || [];
    if (leadsInStatus.length === 0) return "0d avg";
    
    // Mock calculation - in real app, would calculate based on status change timestamps
    const avgDays = Math.floor(Math.random() * 7) + 1;
    return `${avgDays}d avg`;
  };

  // Drag and drop handler with enhanced feedback and error handling
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area, show helpful message
    if (!destination) {
      toast({
        title: "Invalid drop",
        description: "Please drop the lead card into a valid stage column",
        variant: "destructive",
      });
      return;
    }

    // If dropped in the same position, no action needed
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Extract lead ID from draggableId (format: "lead-{id}")
    const leadId = parseInt(draggableId.replace('lead-', ''));
    const newStatus = destination.droppableId;
    const sourceStatus = source.droppableId;
    
    // Find the lead being moved for better feedback
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
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
    
    // Show optimistic feedback immediately
    toast({
      title: "Lead moved",
      description: `${lead.name} moved from ${statusLabels[sourceStatus as keyof typeof statusLabels]} to ${statusLabels[newStatus as keyof typeof statusLabels]}`,
    });

    // Update lead status via parent component (includes API call and optimistic updates)
    onUpdateLeadStatus(leadId, newStatus);
  };

  // Stage Toggle Bar Component for Kanban cards
  const StageToggleBar = ({ 
    currentStatus, 
    onStatusChange, 
    leadId, 
    isUpdating 
  }: { 
    currentStatus: string; 
    onStatusChange: (status: string) => void;
    leadId: number;
    isUpdating: boolean;
  }) => {
    const stages = ["new", "contacted", "qualified", "appointment_set", "closed_won"];
    const stageLabels = {
      new: "New",
      contacted: "Contacted", 
      qualified: "Qualified",
      appointment_set: "Apt Set",
      closed_won: "Done"
    };

    return (
      <div className="flex items-center gap-1">
        {stages.map((stage) => {
          const isActive = currentStatus === stage;
          const isCompleted = stages.indexOf(currentStatus) > stages.indexOf(stage);
          
          return (
            <Button
              key={stage}
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(stage);
              }}
              disabled={isUpdating}
              className={`h-6 px-2 text-xs font-medium transition-all ${
                isActive 
                  ? "bg-blue-600 text-white" 
                  : isCompleted
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              aria-label={`Set stage to ${stageLabels[stage as keyof typeof stageLabels]}`}
            >
              {stageLabels[stage as keyof typeof stageLabels]}
            </Button>
          );
        })}
      </div>
    );
  };

  const LeadCard = ({ lead, index }: { lead: Lead; index: number }) => {
    const serviceTheme = getServiceTypeTheme(lead.serviceType || "regular");

    return (
      <Draggable 
        draggableId={`lead-${lead.id}`} 
        index={index} 
        isDragDisabled={isUpdating}
      >
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            onClick={() => setSelectedLead(lead)}
            className={`mb-3 cursor-pointer ${
              snapshot.isDragging 
                ? "shadow-xl rotate-1 scale-105 bg-blue-50 border-blue-200" 
                : "hover:shadow-md hover:bg-gray-50"
            } transition-all duration-200 border-l-4 ${
              lead.priority === "urgent" ? "border-l-red-500" :
              lead.priority === "high" ? "border-l-orange-500" :
              "border-l-blue-500"
            }`}
            role="button"
            tabIndex={0}
            aria-label={`Lead card for ${lead.name}. Click to view details, drag to move between stages.`}
          >
            <CardContent className="p-3">
              {/* Drag handle and header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    {...provided.dragHandleProps}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                    aria-label="Drag handle"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className={`${serviceTheme.color} text-xs`}>
                    {serviceTheme.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
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

              {/* Estimated value */}
              {lead.estimatedCost && (
                <p className="text-xs font-medium text-green-600 mb-2">
                  Est. Cost: ${lead.estimatedCost}
                </p>
              )}

              {/* Priority badge */}
              {lead.priority && lead.priority !== "normal" && (
                <Badge 
                  variant="outline" 
                  className={`text-xs mb-2 ${
                    lead.priority === "urgent" ? "border-red-500 text-red-600 bg-red-50" :
                    lead.priority === "high" ? "border-orange-500 text-orange-600 bg-orange-50" :
                    "border-blue-500 text-blue-600 bg-blue-50"
                  }`}
                >
                  {lead.priority}
                </Badge>
              )}

              {/* Stage Toggle Bar for quick status changes */}
              <StageToggleBar
                currentStatus={lead.status || "new"}
                onStatusChange={(status) => onUpdateLeadStatus(lead.id, status)}
                leadId={lead.id}
                isUpdating={isUpdating}
              />

            </CardContent>
          </Card>
        )}
      </Draggable>
    );
  };

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
        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 min-h-96 bg-gray-50 rounded-b-lg border-2 border-t-0 transition-colors ${
                snapshot.isDraggingOver 
                  ? "bg-blue-50 border-blue-200" 
                  : "border-gray-200"
              }`}
            >
              {columnLeads.map((lead, index) => (
                <LeadCard key={lead.id} lead={lead} index={index} />
              ))}
              {provided.placeholder}
              
              {/* Empty state */}
              {columnLeads.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No leads in this stage</p>
                  <p className="text-gray-300 text-xs mt-1">Drag leads here</p>
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
      <DragDropContext onDragEnd={handleDragEnd}>
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
        lead={selectedLead}
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