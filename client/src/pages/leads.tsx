import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Phone, Mail, MapPin, Calendar, DollarSign, MessageSquare, User, Clock, AlertTriangle, Plus, Info, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Lead, InsertLead } from "@shared/schema";
import { manualLeadSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber, displayPhoneNumber } from "@/lib/phone";

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [expandedLeads, setExpandedLeads] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Helper functions for accordion
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

  const getUrgencyColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "border-red-500";
      case "high": return "border-orange-400";
      case "normal": return "border-blue-400";
      case "low": return "border-gray-300";
      default: return "border-gray-300";
    }
  };

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  // Send SMS mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { phone: string; message: string }) => {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send SMS");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "SMS sent successfully",
        description: "The message has been sent to the lead.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to send SMS";
      toast({
        title: "SMS failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update lead status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const response = await fetch(`/api/leads/${data.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: data.status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Status updated",
        description: "Lead status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error?.message || "Failed to update lead status",
        variant: "destructive",
      });
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<InsertLead> }) => {
      const response = await fetch(`/api/leads/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Failed to update lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead updated",
        description: "Lead information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating lead",
        description: error?.message || "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: InsertLead) => {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });
      if (!response.ok) throw new Error("Failed to create lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setShowNewLeadDialog(false);
      toast({
        title: "Lead created",
        description: "New lead has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating lead",
        description: error?.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "secondary";
      case "normal": return "outline";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "default";
      case "contacted": return "secondary";
      case "qualified": return "outline";
      case "appointment_set": return "default";
      case "closed_won": return "default";
      case "closed_lost": return "destructive";
      default: return "outline";
    }
  };

  const formatServiceType = (serviceType: string) => {
    switch (serviceType) {
      case "regular": return "Regular Cleaning";
      case "deep": return "Deep Cleaning";
      case "moveout": return "Move-out Cleaning";
      case "commercial": return "Commercial Cleaning";
      default: return serviceType;
    }
  };

  // Filter leads
  const filteredLeads = Array.isArray(leads) ? leads.filter((lead: Lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  }) : [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads Management</h1>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="priority-filter">Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Add Lead Button and Stats */}
            <div className="flex flex-col items-end gap-2">
              <Dialog open={showNewLeadDialog} onOpenChange={setShowNewLeadDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Lead</DialogTitle>
                    <DialogDescription>
                      Add a new lead to the system manually.
                    </DialogDescription>
                  </DialogHeader>
                  <NewLeadForm onSubmit={(data: InsertLead) => createLeadMutation.mutate(data)} />
                </DialogContent>
              </Dialog>
              <p className="text-sm font-medium text-blue-600">
                {Array.isArray(leads) ? leads.length : 0} total leads
              </p>
            </div>
          </div>
          
          {/* Status Filter Buttons */}
          <div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("new")}
              >
                New
              </Button>
              <Button
                variant={statusFilter === "contacted" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("contacted")}
              >
                Contacted
              </Button>
              <Button
                variant={statusFilter === "qualified" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("qualified")}
              >
                Qualified
              </Button>
              <Button
                variant={statusFilter === "appointment_set" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("appointment_set")}
              >
                Appointment Set
              </Button>
              <Button
                variant={statusFilter === "closed_won" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("closed_won")}
              >
                Closed Won
              </Button>
              <Button
                variant={statusFilter === "closed_lost" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("closed_lost")}
              >
                Closed Lost
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Accordion List */}
      <div className="space-y-2">
        {filteredLeads.map((lead: Lead) => {
          const isExpanded = expandedLeads.has(lead.id);
          
          return (
            <div 
              key={lead.id} 
              className={`border rounded-lg bg-white transition-all duration-200 ${
                isExpanded ? 'shadow-md' : 'hover:shadow-sm'
              } ${getUrgencyColor(lead.priority || 'normal')} border-l-4`}
            >
              {/* Collapsed Row */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleLeadExpansion(lead.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleLeadExpansion(lead.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-expanded={isExpanded}
                aria-label={`Lead details for ${lead.name}`}
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
                  
                  {/* Name */}
                  <div className="flex-shrink-0">
                    <h3 className="font-semibold text-gray-900 capitalize">{lead.name}</h3>
                  </div>
                  
                  {/* Submission Date */}
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, h:mm a") : "No date"}
                  </div>
                  
                  {/* Phone Number (Click-to-call) */}
                  <div className="flex-shrink-0">
                    <a 
                      href={`tel:${lead.phone}`}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {displayPhoneNumber(lead.phone)}
                    </a>
                  </div>
                </div>
                
                {/* Right Side Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Customer Type Selection */}
                  <div className="flex-shrink-0">
                    <Select 
                      value={lead.status} 
                      onValueChange={(status) => {
                        updateStatusMutation.mutate({ id: lead.id, status });
                      }}
                    >
                      <SelectTrigger 
                        className="h-8 w-28 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="appointment_set">Appointment Set</SelectItem>
                        <SelectItem value="closed_won">Closed Won</SelectItem>
                        <SelectItem value="closed_lost">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Quick SMS Icon */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendMessageMutation.mutate({
                        phone: lead.phone,
                        message: `Hi ${lead.name}, thanks for your interest in our ${formatServiceType(lead.serviceType).toLowerCase()} service. When would be a good time to discuss your cleaning needs?`
                      });
                    }}
                    disabled={sendMessageMutation.isPending}
                    title="Send Quick SMS"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t bg-gray-50/50">
                  <div className="pt-4 space-y-4">
                    {/* Service and Priority Info */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={getPriorityColor(lead.priority || 'normal')}>
                        {lead.priority === "urgent" && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {lead.priority || 'normal'}
                      </Badge>
                      <Badge variant="outline">{formatServiceType(lead.serviceType)}</Badge>
                      <Badge variant="outline">{lead.source}</Badge>
                    </div>
                    
                    {/* Contact Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                      {lead.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">{lead.address}</span>
                        </div>
                      )}
                      {lead.preferredDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{lead.preferredDate}</span>
                        </div>
                      )}
                      {lead.estimatedCost && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span>${lead.estimatedCost}</span>
                        </div>
                      )}
                      {lead.rooms && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{lead.rooms}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {lead.notes && (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        <div className="line-clamp-2">{lead.notes}</div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedLead(lead)}>
                            Edit Lead
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="capitalize">{selectedLead?.name}</DialogTitle>
                            <DialogDescription>Lead Details and Actions</DialogDescription>
                          </DialogHeader>
                          {selectedLead && (
                            <LeadDetailsModal
                              lead={selectedLead}
                              onUpdateStatus={(status) => updateStatusMutation.mutate({ id: selectedLead.id, status })}
                              onUpdateLead={(updates) => updateLeadMutation.mutate({ id: selectedLead.id, updates })}
                              onSendMessage={(message) => sendMessageMutation.mutate({ phone: selectedLead.phone, message })}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredLeads.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters to see more leads."
                  : "Get started by adding your first lead or let customers submit inquiries through your widget."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Lead Details Modal Component
function LeadDetailsModal({ 
  lead, 
  onUpdateStatus, 
  onUpdateLead, 
  onSendMessage 
}: { 
  lead: Lead;
  onUpdateStatus: (status: string) => void;
  onUpdateLead: (updates: Partial<InsertLead>) => void;
  onSendMessage: (message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<InsertLead>>({
    name: lead.name,
    email: lead.email || "",
    phone: lead.phone,
    address: lead.address || "",
    serviceType: lead.serviceType,
    priority: lead.priority || "normal",
    estimatedCost: lead.estimatedCost || 0,
    rooms: lead.rooms || "",
    notes: lead.notes || "",
  });

  const handleSave = () => {
    onUpdateLead(editData);
    setEditMode(false);
  };

  const quickMessages = [
    "Hi! Thanks for your interest in our cleaning services. When would be a good time to discuss your needs?",
    "Hello! I'd like to schedule a free consultation for your cleaning service. Are you available this week?",
    "Thank you for contacting us! We can provide a quote after a quick phone consultation. What's your availability?",
  ];

  const [customMessage, setCustomMessage] = useState("");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      
      <TabsContent value="details" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Lead Information</h3>
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => editMode ? handleSave() : setEditMode(true)}
          >
            {editMode ? "Save Changes" : "Edit"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            {editMode ? (
              <Input
                value={editData.name || ""}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            ) : (
              <p className="p-2 bg-muted rounded">{lead.name}</p>
            )}
          </div>
          
          <div>
            <Label>Email</Label>
            {editMode ? (
              <Input
                value={editData.email || ""}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            ) : (
              <p className="p-2 bg-muted rounded">{lead.email || "Not provided"}</p>
            )}
          </div>
          
          <div>
            <Label>Phone</Label>
            {editMode ? (
              <Input
                value={editData.phone || ""}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            ) : (
              <p className="p-2 bg-muted rounded">{displayPhoneNumber(lead.phone)}</p>
            )}
          </div>
          
          <div>
            <Label>Service Type</Label>
            {editMode ? (
              <Select
                value={editData.serviceType}
                onValueChange={(value) => setEditData({ ...editData, serviceType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Cleaning</SelectItem>
                  <SelectItem value="deep">Deep Cleaning</SelectItem>
                  <SelectItem value="moveout">Move-out Cleaning</SelectItem>
                  <SelectItem value="commercial">Commercial Cleaning</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="p-2 bg-muted rounded">
                {lead.serviceType === "regular" && "Regular Cleaning"}
                {lead.serviceType === "deep" && "Deep Cleaning"}
                {lead.serviceType === "moveout" && "Move-out Cleaning"}
                {lead.serviceType === "commercial" && "Commercial Cleaning"}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label>Status</Label>
          <Select value={lead.status} onValueChange={onUpdateStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="appointment_set">Appointment Set</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Address</Label>
            {editMode ? (
              <Input
                value={editData.address || ""}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              />
            ) : (
              <p className="p-2 bg-muted rounded">{lead.address || "Not provided"}</p>
            )}
          </div>
          
          <div>
            <Label>Estimated Cost</Label>
            {editMode ? (
              <Input
                type="number"
                value={editData.estimatedCost || ""}
                onChange={(e) => setEditData({ ...editData, estimatedCost: parseInt(e.target.value) || 0 })}
              />
            ) : (
              <p className="p-2 bg-muted rounded">
                {lead.estimatedCost ? `$${lead.estimatedCost}` : "Not estimated"}
              </p>
            )}
          </div>
          
          <div>
            <Label>Rooms</Label>
            {editMode ? (
              <Input
                value={editData.rooms || ""}
                onChange={(e) => setEditData({ ...editData, rooms: e.target.value })}
              />
            ) : (
              <p className="p-2 bg-muted rounded">{lead.rooms || "Not specified"}</p>
            )}
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          {editMode ? (
            <Textarea
              value={editData.notes || ""}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={3}
            />
          ) : (
            <p className="p-2 bg-muted rounded min-h-[80px]">{lead.notes || "No notes"}</p>
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="messages" className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-3">Quick Messages</h3>
          <div className="space-y-2">
            {quickMessages.map((message, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <p className="text-sm flex-1 mr-3">{message}</p>
                <Button size="sm" onClick={() => onSendMessage(message)}>
                  Send
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Custom Message</h3>
          <div className="space-y-2">
            <Textarea
              placeholder="Type your custom message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={() => {
                onSendMessage(customMessage);
                setCustomMessage("");
              }}
              disabled={!customMessage.trim()}
            >
              Send Custom Message
            </Button>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="history">
        <p className="text-muted-foreground">Lead history and timeline will be displayed here.</p>
      </TabsContent>
    </Tabs>
  );
}

// New Lead Form Component
function NewLeadForm({ onSubmit }: { onSubmit: (data: InsertLead) => void }) {
  const form = useForm<InsertLead>({
    resolver: zodResolver(manualLeadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      serviceType: "regular",
      priority: "normal",
      source: "manual",
      status: "new",
      address: "",
      notes: "",
    },
  });

  const handleSubmit = (data: InsertLead) => {
    // Format phone number before submission
    const formattedData = {
      ...data,
      phone: formatPhoneNumber(data.phone),
    };
    onSubmit(formattedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter customer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="customer@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="regular">Regular Cleaning</SelectItem>
                    <SelectItem value="deep">Deep Cleaning</SelectItem>
                    <SelectItem value="moveout">Move-out Cleaning</SelectItem>
                    <SelectItem value="commercial">Commercial Cleaning</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Service address" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional information about the lead..."
                  rows={3}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Create Lead
        </Button>
      </form>
    </Form>
  );
}