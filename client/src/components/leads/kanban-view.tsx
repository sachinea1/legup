import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin } from "lucide-react";
import type { Lead } from "@shared/schema";
import { getStatusTheme, getServiceTypeTheme } from "@/lib/theme";
import { displayPhoneNumber } from "@/lib/phone";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface KanbanViewProps {
  leads: Lead[];
  onUpdateLeadStatus: (id: number, status: string) => void;
  isUpdating: boolean;
}

export function KanbanView({ leads, onUpdateLeadStatus, isUpdating }: KanbanViewProps) {
  const { toast } = useToast();
  
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

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) return;

    // If dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const leadId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Update lead status
    onUpdateLeadStatus(leadId, newStatus);
    
    // Show success toast with new stage name
    const statusLabels = {
      new: "New",
      contacted: "Contacted", 
      qualified: "Qualified",
      appointment_set: "Appointment Set",
      closed_won: "Completed"
    };
    
    toast({
      title: "Lead Moved",
      description: `Moved to ${statusLabels[newStatus as keyof typeof statusLabels]}`,
    });
  };

  const LeadCard = ({ lead, index }: { lead: Lead; index: number }) => {
    const serviceTheme = getServiceTypeTheme(lead.serviceType || "regular");

    return (
      <Draggable draggableId={lead.id.toString()} index={index} isDragDisabled={isUpdating}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`mb-3 cursor-grab active:cursor-grabbing ${
              snapshot.isDragging ? "shadow-lg rotate-2 scale-105" : "hover:shadow-md"
            } transition-all duration-200`}
          >
            <CardContent className="p-3">
              {/* Header with service type only */}
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className={`${serviceTheme.color} text-xs`}>
                  {serviceTheme.label}
                </Badge>
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
              {lead.estimatedValue && (
                <p className="text-xs font-medium text-green-600 mb-2">
                  Est. Value: ${lead.estimatedValue}
                </p>
              )}


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
    </div>
  );
}