import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, ChevronDown, ChevronRight, MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Lead } from "@shared/schema";
import { getStatusTheme, getPriorityTheme, getServiceTypeTheme } from "@/lib/theme";
import { displayPhoneNumber } from "@/lib/phone";

interface ListViewProps {
  leads: Lead[];
  onUpdateLeadStatus: (id: number, status: string) => void;
  isUpdating: boolean;
}

export function ListView({ leads, onUpdateLeadStatus, isUpdating }: ListViewProps) {
  const [expandedLeads, setExpandedLeads] = useState<Set<number>>(new Set());

  const toggleLeadExpansion = (leadId: number) => {
    setExpandedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Status navigation bar with arrow design
  const statusStages = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "appointment_set", label: "Appointment Set" },
    { value: "closed_won", label: "Closed Won" },
    { value: "closed_lost", label: "Closed Lost" },
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
                ${index === 0 ? "rounded-l-md" : ""}
                ${index === statusStages.length - 1 ? "rounded-r-md" : ""}
                ${index > 0 ? "-ml-1" : ""}
              `}
              style={{
                clipPath: index === statusStages.length - 1 
                  ? "none" 
                  : "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)"
              }}
            >
              {stage.label}
            </Button>
          </div>
        );
      })}
    </div>
  );

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No leads found</div>
        <div className="text-gray-400 text-sm mt-2">Try adjusting your filters or add a new lead</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => {
        const isExpanded = expandedLeads.has(lead.id);
        const priorityTheme = getPriorityTheme(lead.priority || "normal");
        const statusTheme = getStatusTheme(lead.status);
        const serviceTheme = getServiceTypeTheme(lead.serviceType || "regular");

        return (
          <Card 
            key={lead.id} 
            className={`transition-all duration-200 border-l-4 ${priorityTheme.cardAccent} ${
              isExpanded ? 'shadow-md' : 'hover:shadow-sm'
            }`}
          >
            {/* Collapsed Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleLeadExpansion(lead.id)}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Expand Icon */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                
                {/* Lead Info */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize truncate">{lead.name}</h3>
                    <p className="text-sm text-gray-500 truncate">
                      {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, h:mm a") : "No date"}
                    </p>
                  </div>
                  
                  <div>
                    <a 
                      href={`tel:${lead.phone}`}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-3 h-3" />
                      {displayPhoneNumber(lead.phone)}
                    </a>
                    {lead.email && (
                      <a 
                        href={`mailto:${lead.email}`}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </a>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={priorityTheme.color}>
                      {priorityTheme.icon} {priorityTheme.label}
                    </Badge>
                    <Badge variant="outline" className={serviceTheme.color}>
                      {serviceTheme.label}
                    </Badge>
                  </div>
                  
                  <div>
                    <Badge variant="outline" className={statusTheme.color}>
                      {statusTheme.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-4">
                {/* Status Navigation */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Lead Status Pipeline
                  </label>
                  <StatusNavigationBar
                    currentStatus={lead.status}
                    onStatusChange={(status) => onUpdateLeadStatus(lead.id, status)}
                    leadId={lead.id}
                  />
                </div>

                {/* Lead Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Service Details</label>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-900">Service: {serviceTheme.label}</p>
                        {lead.rooms && <p className="text-sm text-gray-600">Rooms: {lead.rooms}</p>}
                        {lead.address && (
                          <p className="text-sm text-gray-600 flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {lead.address}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {lead.notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <p className="text-sm text-gray-600 mt-1">{lead.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Lead Source</label>
                      <p className="text-sm text-gray-600 mt-1 capitalize">{lead.source || "Unknown"}</p>
                    </div>
                    
                    {lead.estimatedValue && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Estimated Value</label>
                        <p className="text-sm text-gray-900 mt-1 font-medium">${lead.estimatedValue}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement SMS functionality
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send SMS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement appointment booking
                    }}
                  >
                    <Calendar className="w-4 h-4" />
                    Book Appointment
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}