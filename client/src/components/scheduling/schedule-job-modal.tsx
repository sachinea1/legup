import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, Clock, MapPin, User, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@shared/schema";
import { getServiceTypeTheme } from "@/lib/theme";
import { displayPhoneNumber } from "@/lib/phone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ScheduleJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  preselectedDate?: Date;
  preselectedTime?: string;
}

// Mock team members for staff assignment
const mockTeamMembers = [
  { id: 1, name: "Sarah Johnson", role: "Team Lead", avatar: "SJ", color: "bg-blue-500" },
  { id: 2, name: "Mike Chen", role: "Cleaner", avatar: "MC", color: "bg-green-500" },
  { id: 3, name: "Lisa Rodriguez", role: "Cleaner", avatar: "LR", color: "bg-purple-500" },
  { id: 4, name: "David Kim", role: "Cleaner", avatar: "DK", color: "bg-orange-500" },
];

const timeSlots = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM"
];

export function ScheduleJobModal({ 
  open, 
  onOpenChange, 
  lead,
  preselectedDate,
  preselectedTime
}: ScheduleJobModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(preselectedDate);
  const [selectedTime, setSelectedTime] = useState(preselectedTime || "");
  const [assignedStaff, setAssignedStaff] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("120"); // Default 2 hours

  const scheduleJobMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Job Scheduled",
        description: `Job scheduled for ${format(selectedDate!, 'MMM d, yyyy')} at ${selectedTime}`,
      });
      onOpenChange(false);
      // Reset form
      setSelectedDate(preselectedDate);
      setSelectedTime(preselectedTime || "");
      setAssignedStaff("");
      setNotes("");
      setDuration("120");
    },
    onError: (error) => {
      console.error("Error scheduling job:", error);
      toast({
        title: "Error",
        description: "Failed to schedule job. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSchedule = async () => {
    if (!lead || !selectedDate || !selectedTime || !assignedStaff) {
      toast({
        title: "Missing Information",
        description: "Please select a date, time, and assign staff member.",
        variant: "destructive",
      });
      return;
    }

    // Create the appointment
    const appointmentData = {
      leadId: lead.id,
      customerName: lead.name,
      customerPhone: lead.phone,
      serviceType: lead.serviceType || 'standard',
      address: lead.address || '',
      scheduledDate: new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${convertTo24Hour(selectedTime)}`),
      duration: parseInt(duration),
      status: 'pending',
      notes
    };

    scheduleJobMutation.mutate(appointmentData);
  };

  const convertTo24Hour = (time12h: string) => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
      hours = '00';
    }
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }
    return `${hours}:${minutes}`;
  };

  if (!lead) return null;

  const serviceTheme = getServiceTypeTheme(lead.serviceType || 'standard');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Job</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 capitalize">{lead.name}</h3>
                <Badge variant="outline" className={`${serviceTheme.color} text-xs mt-1`}>
                  {serviceTheme.label}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{displayPhoneNumber(lead.phone)}</span>
                </div>
                
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{lead.email}</span>
                  </div>
                )}
                
                {lead.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{lead.address}</span>
                  </div>
                )}
              </div>
              
              {lead.rooms && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Rooms:</span> {lead.rooms}
                </div>
              )}
              
              {lead.estimatedCost && (
                <div className="text-sm text-green-600 font-medium">
                  Estimated Cost: ${lead.estimatedCost}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduling Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schedule Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Selection */}
              <div>
                <Label htmlFor="date" className="text-sm font-medium mb-2 block">
                  Select Date
                </Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              {/* Time Selection */}
              <div>
                <Label htmlFor="time" className="text-sm font-medium mb-2 block">
                  Select Time
                </Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Staff Assignment */}
              <div>
                <Label htmlFor="staff" className="text-sm font-medium mb-2 block">
                  Assign Staff
                </Label>
                <Select value={assignedStaff} onValueChange={setAssignedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTeamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className={`${member.color} text-white text-xs`}>
                              {member.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                          <span className="text-xs text-gray-500">({member.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration" className="text-sm font-medium mb-2 block">
                  Duration (minutes)
                </Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                  Notes (optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Special instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={scheduleJobMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedDate || !selectedTime || !assignedStaff || scheduleJobMutation.isPending}
            className="min-w-[120px]"
          >
            {scheduleJobMutation.isPending ? "Scheduling..." : "Schedule Job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}