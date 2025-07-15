import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { Lead } from "@shared/schema";
import { getStatusTheme, getServiceTypeTheme } from "@/lib/theme";
import { displayPhoneNumber } from "@/lib/phone";

interface ListViewProps {
  leads: Lead[];
  onUpdateLeadStatus: (id: number, status: string) => void;
  isUpdating: boolean;
  highPriorityOnly: boolean;
  onHighPriorityChange: (enabled: boolean) => void;
}

export function ListView({ 
  leads, 
  onUpdateLeadStatus, 
  isUpdating, 
  highPriorityOnly, 
  onHighPriorityChange 
}: ListViewProps) {
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

  // Sort leads: high priority first if toggle is on, then by status, then by creation date
  const sortedLeads = [...leads].sort((a, b) => {
    if (highPriorityOnly) {
      const aIsHigh = a.priority === "high" || a.priority === "urgent";
      const bIsHigh = b.priority === "high" || b.priority === "urgent";
      if (aIsHigh && !bIsHigh) return -1;
      if (!aIsHigh && bIsHigh) return 1;
    }
    
    // Sort by status order
    const statusOrder = ["new", "contacted", "qualified", "appointment_set", "closed_won", "closed_lost"];
    const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    
    // Sort by creation date (newest first)
    const aDate = new Date(a.createdAt || 0);
    const bDate = new Date(b.createdAt || 0);
    return bDate.getTime() - aDate.getTime();
  });

  // Filter leads if high priority only is enabled
  const filteredLeads = highPriorityOnly 
    ? sortedLeads.filter(lead => lead.priority === "high" || lead.priority === "urgent")
    : sortedLeads;

  if (filteredLeads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No leads found</div>
        <div className="text-gray-400 text-sm mt-2">Try adjusting your filters or add a new lead</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* High Priority Toggle */}
      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
        <div>
          <Label htmlFor="high-priority-toggle" className="text-sm font-medium">
            Show High Priority Only
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            Display only urgent and high priority leads at the top
          </p>
        </div>
        <Switch
          id="high-priority-toggle"
          checked={highPriorityOnly}
          onCheckedChange={onHighPriorityChange}
        />
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {filteredLeads.map((lead) => {
          const isExpanded = expandedLeads.has(lead.id);
          const statusTheme = getStatusTheme(lead.status);
          const serviceTheme = getServiceTypeTheme(lead.serviceType || "regular");
          const isHighPriority = lead.priority === "high" || lead.priority === "urgent";

          return (
            <Card 
              key={lead.id} 
              className={`transition-all duration-200 border-l-4 ${
                isHighPriority ? 'border-l-red-500' : 'border-l-gray-300'
              } ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}
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
                    <Badge variant="outline" className={serviceTheme.color}>
                      {serviceTheme.label}
                    </Badge>
                    {isHighPriority && (
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        High Priority
                      </Badge>
                    )}
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

                {/* Lead Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </CardContent>
            )}
          </Card>
        );
        })}
      </div>
    </div>
  );
}