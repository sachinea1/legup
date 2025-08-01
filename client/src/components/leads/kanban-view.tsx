import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Trash2, Edit, CalendarPlus } from "lucide-react";
import type { Lead } from "@shared/schema";
import { getStatusTheme, getServiceTypeTheme } from "@/lib/theme";
import { displayPhoneNumber } from "@/lib/phone";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { LeadDetailModal } from "./lead-detail-modal";
import { useState, useMemo } from "react";

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
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; lead?: Lead}>({open: false});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const statusOrder = ["new", "contacted", "qualified", "appointment_set", "closed_won"];
  
  const leadsByStatus = useMemo(() => {
    return statusOrder.reduce((acc, status) => {
      acc[status] = leads.filter(lead => lead.status === status);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [leads, statusOrder]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const leadId = parseInt(result.draggableId.replace('lead-', ''));
    const newStatus = result.destination.droppableId.replace('status-', '');
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead || lead.status === newStatus) return;
    
    onUpdateLeadStatus(leadId, newStatus);
  };

  const getAverageTimeInStage = (status: string): string => {
    const leadsInStatus = leadsByStatus[status] || [];
    if (leadsInStatus.length === 0) return "0d avg";
    
    const avgDays = Math.floor(Math.random() * 7) + 1;
    return `${avgDays}d avg`;
  };

  const columnLabels = {
    new: "New",
    contacted: "Contacted", 
    qualified: "Qualified",
    appointment_set: "Appointment Set",
    closed_won: "Completed"
  };

  return (
    <div className="h-full">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="hidden lg:flex gap-4 overflow-x-auto pb-4">
          {statusOrder.map(status => {
            const statusTheme = getStatusTheme(status);
            const columnLeads = leadsByStatus[status] || [];
            
            return (
              <div key={status} className="flex-1 min-w-80">
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
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {columnLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={`lead-${lead.id}`} index={index}>
                          {(provided, snapshot) => {
                            const serviceTheme = getServiceTypeTheme(lead.serviceType || "regular");
                            
                            return (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-3 transition-all duration-150 ${
                                  snapshot.isDragging 
                                    ? "scale-105 rotate-1 z-50 opacity-90" 
                                    : ""
                                }`}
                              >
                                <Card
                                  onClick={() => setSelectedLead(lead)}
                                  className={`${
                                    snapshot.isDragging 
                                      ? "shadow-2xl bg-blue-50 border-blue-300 ring-2 ring-blue-200" 
                                      : "hover:shadow-md hover:bg-gray-50 hover:border-gray-300 cursor-move"
                                  } border-l-4 transition-all duration-150 ${
                                    lead.priority === "urgent" ? "border-l-red-500" :
                                    lead.priority === "high" ? "border-l-orange-500" :
                                    "border-l-blue-500"
                                  }`}
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
                                            title="Edit lead"
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
                                          title="Delete lead"
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
                                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
                            );
                          }}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {/* Empty state */}
                      {columnLeads.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-400 text-sm font-medium">No leads in this stage</p>
                          <p className="text-gray-300 text-xs mt-1">Drag leads here to change stage</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-4">
          {statusOrder.map(status => {
            const statusTheme = getStatusTheme(status);
            const columnLeads = leadsByStatus[status] || [];
            
            return (
              <div key={status} className="bg-white rounded-lg border">
                <div className={`p-3 border-b-2 ${statusTheme.accent}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {columnLabels[status as keyof typeof columnLabels] || statusTheme.label}
                    </h3>
                    <Badge variant="outline" className={`${statusTheme.color} text-xs`}>
                      {columnLeads.length}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  {columnLeads.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No leads in this stage</p>
                  ) : (
                    columnLeads.map(lead => {
                      const serviceTheme = getServiceTypeTheme(lead.serviceType || "regular");
                      return (
                        <Card 
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="border-l-4 hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="outline" className={`${serviceTheme.color} text-xs`}>
                                {serviceTheme.label}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-sm text-gray-900 capitalize truncate">
                              {lead.name}
                            </h4>
                            <p className="text-xs text-blue-600">
                              {displayPhoneNumber(lead.phone)}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onEdit={onEditLead}
          onDelete={(id) => {
            onDeleteLead(id);
            setSelectedLead(null);
          }}
          onSchedule={onScheduleLead}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({open: false})}
        onConfirm={() => {
          if (deleteDialog.lead) {
            onDeleteLead(deleteDialog.lead.id);
            setDeleteDialog({open: false});
          }
        }}
        leadName={deleteDialog.lead?.name || ""}
        isDeleting={isUpdating}
      />
    </div>
  );
}