import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Phone, Mail, MapPin, Calendar, DollarSign, MessageSquare, User, Clock, AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Lead, InsertLead } from "@shared/schema";
import { manualLeadSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/leads/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Lead> }) =>
      apiRequest(`/api/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLead(null);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, message }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message sent",
        description: "SMS message sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Message failed",
        description: error.message.includes("verification") 
          ? "Phone number needs verification in Twilio console for trial accounts"
          : error.message,
        variant: "destructive",
      });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: (leadData: InsertLead) =>
      fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(leadData),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create lead');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setShowNewLeadDialog(false);
      toast({
        title: "Lead created",
        description: "New lead has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const filteredLeads = leads?.filter((lead: Lead) => {
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
    const matchesSearch = !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  }) || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "destructive";
      case "normal": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "destructive";
      case "contacted": return "secondary";
      case "qualified": return "default";
      case "appointment_set": return "default";
      case "closed_won": return "default";
      case "closed_lost": return "outline";
      default: return "secondary";
    }
  };

  const formatServiceType = (type: string) => {
    switch (type) {
      case "regular": return "Regular Cleaning";
      case "deep": return "Deep Cleaning";
      case "moveout": return "Move-out Cleaning";
      case "commercial": return "Commercial Cleaning";
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leads Management</h1>
          <p className="text-muted-foreground">Manage and track all your cleaning service leads</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {filteredLeads.length} of {leads?.length || 0} leads
          </div>
          <Dialog open={showNewLeadDialog} onOpenChange={setShowNewLeadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Create a new lead manually for your cleaning service business
                </DialogDescription>
              </DialogHeader>
              <NewLeadForm onSubmit={(data) => createLeadMutation.mutate(data)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search leads by name, phone, email, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="appointment_set">Appointment Set</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead: Lead) => (
          <Card key={lead.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{lead.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getPriorityColor(lead.priority)}>
                          {lead.priority === "urgent" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {lead.priority}
                        </Badge>
                        <Badge variant={getStatusColor(lead.status)}>{lead.status.replace("_", " ")}</Badge>
                        <Badge variant="outline">{formatServiceType(lead.serviceType)}</Badge>
                        <Badge variant="outline">{lead.source}</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(lead.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{lead.phone}</span>
                    </div>
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
                        <span>{format(new Date(lead.preferredDate), "MMM d, yyyy")}</span>
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

                  {lead.notes && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                      <div className="line-clamp-2">{lead.notes}</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[120px]">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedLead(lead)}>
                        View Details
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

                  <Select value={lead.status} onValueChange={(status) => updateStatusMutation.mutate({ id: lead.id, status })}>
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendMessageMutation.mutate({
                      phone: lead.phone,
                      message: `Hi ${lead.name}, thanks for your interest in our ${formatServiceType(lead.serviceType).toLowerCase()} service. When would be a good time to discuss your cleaning needs?`
                    })}
                    disabled={sendMessageMutation.isPending}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Quick SMS
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredLeads.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters to see more leads."
                  : "New leads will appear here when customers submit inquiries."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LeadDetailsModal({
  lead,
  onUpdateStatus,
  onUpdateLead,
  onSendMessage,
}: {
  lead: Lead;
  onUpdateStatus: (status: string) => void;
  onUpdateLead: (updates: Partial<Lead>) => void;
  onSendMessage: (message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(lead);
  const [customMessage, setCustomMessage] = useState("");

  const handleSave = () => {
    onUpdateLead(editData);
    setEditMode(false);
  };

  const quickMessages = [
    `Hi ${lead.name}, thanks for your interest in our cleaning services. When would be a good time to discuss your needs?`,
    `Hello ${lead.name}, I'd like to schedule a time to provide you with a quote for your ${lead.serviceType} cleaning service.`,
    `Hi ${lead.name}, we have availability for your cleaning service. Can we schedule an appointment this week?`,
    `Thank you for choosing our cleaning services, ${lead.name}. Your appointment has been confirmed.`,
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="notes">Notes & Updates</TabsTrigger>
        <TabsTrigger value="communication">Communication</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Lead Information</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editMode ? handleSave() : setEditMode(true)}
          >
            {editMode ? "Save Changes" : "Edit"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            {editMode ? (
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            ) : (
              <p className="capitalize">{lead.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            {editMode ? (
              <Input
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            ) : (
              <p>{lead.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            {editMode ? (
              <Input
                value={editData.email || ""}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            ) : (
              <p>{lead.email || "Not provided"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Service Type</Label>
            {editMode ? (
              <Select
                value={editData.serviceType}
                onValueChange={(value) => setEditData({ ...editData, serviceType: value })}
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
              <p>{lead.serviceType}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            {editMode ? (
              <Select
                value={editData.priority}
                onValueChange={(value) => setEditData({ ...editData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={lead.priority === "urgent" ? "destructive" : "secondary"}>
                {lead.priority}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
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

          {lead.address && (
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              {editMode ? (
                <Input
                  value={editData.address || ""}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              ) : (
                <p>{lead.address}</p>
              )}
            </div>
          )}

          {lead.rooms && (
            <div className="space-y-2">
              <Label>Rooms</Label>
              {editMode ? (
                <Input
                  value={editData.rooms || ""}
                  onChange={(e) => setEditData({ ...editData, rooms: e.target.value })}
                />
              ) : (
                <p>{lead.rooms}</p>
              )}
            </div>
          )}

          {lead.estimatedCost && (
            <div className="space-y-2">
              <Label>Estimated Cost</Label>
              {editMode ? (
                <Input
                  type="number"
                  value={editData.estimatedCost || ""}
                  onChange={(e) => setEditData({ ...editData, estimatedCost: parseInt(e.target.value) })}
                />
              ) : (
                <p>${lead.estimatedCost}</p>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="notes" className="space-y-4">
        <div className="space-y-2">
          <Label>Notes</Label>
          {editMode ? (
            <Textarea
              value={editData.notes || ""}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={8}
              placeholder="Add notes about this lead..."
            />
          ) : (
            <div className="bg-muted/50 p-4 rounded-md min-h-[200px] whitespace-pre-wrap">
              {lead.notes || "No notes available"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Created: {format(new Date(lead.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Updated: {format(new Date(lead.updatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
      </TabsContent>

      <TabsContent value="communication" className="space-y-4">
        <div className="space-y-4">
          <h4 className="font-semibold">Quick Messages</h4>
          <div className="space-y-2">
            {quickMessages.map((message, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full text-left justify-start h-auto p-3"
                onClick={() => onSendMessage(message)}
              >
                <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{message}</span>
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Custom Message</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type a custom message..."
              rows={3}
            />
            <Button
              onClick={() => {
                if (customMessage.trim()) {
                  onSendMessage(customMessage);
                  setCustomMessage("");
                }
              }}
              disabled={!customMessage.trim()}
            >
              Send Custom Message
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function NewLeadForm({ onSubmit }: { onSubmit: (data: InsertLead) => void }) {
  const form = useForm<InsertLead>({
    resolver: zodResolver(manualLeadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      serviceType: "regular",
      rooms: "",
      address: "",
      notes: "",
      priority: "normal",
      status: "new",
      source: "manual",
    },
  });

  const handleSubmit = (data: InsertLead) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Customer name" {...field} />
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

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="customer@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="rooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rooms/Size</FormLabel>
                <FormControl>
                  <Input placeholder="3 bedrooms, 2 bathrooms" {...field} />
                </FormControl>
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
                <Input placeholder="123 Main Street, City, State" {...field} />
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancel
          </Button>
          <Button type="submit">Create Lead</Button>
        </div>
      </form>
    </Form>
  );
}