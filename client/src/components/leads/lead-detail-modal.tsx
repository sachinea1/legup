import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Lead } from "@shared/schema";
import { getStatusTheme, getServiceTypeTheme } from "@/lib/theme";
import { displayPhoneNumber } from "@/lib/phone";

interface LeadDetailModalProps {
  lead?: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateLeadStatus: (id: number, status: string) => void;
  onDeleteLead: (id: number) => void;
  isUpdating: boolean;
}

export function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  onUpdateLeadStatus,
  onDeleteLead,
  isUpdating
}: LeadDetailModalProps) {
  if (!lead) return null;

  const statusTheme = getStatusTheme(lead.status);
  const serviceTheme = getServiceTypeTheme(lead.serviceType || "regular");
  const isHighPriority = lead.priority === "high" || lead.priority === "urgent";

  // Status navigation bar with arrow design
  const statusStages = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "appointment_set", label: "Appointment Set" },
    { value: "closed_won", label: "Completed" },
  ];

  const StatusNavigationBar = ({ currentStatus, onStatusChange, leadId }: { 
    currentStatus: string; 
    onStatusChange: (status: string) => void;
    leadId: number;
  }) => (
    <div className="flex items-center bg-gray-50 rounded-lg p-1 gap-0">
      {statusStages.map((stage, index) => {
        const isActive = currentStatus === stage.value;
        const isCompleted = statusStages.findIndex(s => s.value === currentStatus) > index;
        
        return (
          <div key={stage.value} className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange(stage.value)}
              disabled={isUpdating}
              className={`
                relative h-8 px-3 text-xs font-medium transition-all
                ${isActive 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : isCompleted
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }
                ${index > 0 ? "-ml-1" : ""}
              `}
              style={{
                clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)"
              }}
            >
              <span className="pl-2">{stage.label}</span>
            </Button>
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold capitalize">
                {lead.name}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, h:mm a") : "No date"}
              </p>
            </div>
            {/* CHANGED: Removed delete button from modal header */}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Info Header */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={statusTheme.color}>
              {statusTheme.label}
            </Badge>
            <Badge variant="outline" className={serviceTheme.color}>
              {serviceTheme.label}
            </Badge>
            {isHighPriority && (
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                High Priority
              </Badge>
            )}
          </div>

          {/* Status Navigation */}
          <div>
            <StatusNavigationBar
              currentStatus={lead.status}
              onStatusChange={(status) => {
                onUpdateLeadStatus(lead.id, status);
                // Update the local lead state to reflect the change immediately
                lead.status = status;
              }}
              leadId={lead.id}
            />
          </div>

          {/* Lead Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Contact Information</label>
                <div className="mt-2 space-y-2">
                  <a 
                    href={`tel:${lead.phone}`}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    {displayPhoneNumber(lead.phone)}
                  </a>
                  {lead.email && (
                    <a 
                      href={`mailto:${lead.email}`}
                      className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      {lead.email}
                    </a>
                  )}
                  {lead.address && (
                    <p className="text-sm text-gray-600 flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {lead.address}
                    </p>
                  )}
                </div>
              </div>
              
              {lead.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded-md">{lead.notes}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Service Details</label>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-900">Service: {serviceTheme.label}</p>
                  {lead.rooms && <p className="text-sm text-gray-600">Rooms: {lead.rooms}</p>}
                </div>
              </div>
              

              
              {lead.estimatedCost && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Cost</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">${lead.estimatedCost}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}