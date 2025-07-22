import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
  Phone,
  GripVertical
} from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, addDays, subDays, isSameDay, parseISO, isToday } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import type { Appointment, Lead } from "@shared/schema";
import { displayPhoneNumber } from "@/lib/phone";
import { getServiceTypeTheme } from "@/lib/theme";
import { ScheduleJobModal } from "@/components/scheduling/schedule-job-modal";
import { useToast } from "@/hooks/use-toast";

// Mock staff data - replace with actual API data
const mockStaff = [
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

type ViewMode = "week" | "day";

export default function Schedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch leads for quick scheduling
  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Calculate week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment: Appointment) => {
      const matchesStaff = selectedStaff === "all" || appointment.assignedCleaner === selectedStaff;
      const matchesServiceType = selectedServiceType === "all" || appointment.serviceType === selectedServiceType;
      const matchesSearch = searchQuery === "" || 
        appointment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStaff && matchesServiceType && matchesSearch;
    });
  }, [appointments, selectedStaff, selectedServiceType, searchQuery]);

  // Get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    return filteredAppointments.filter((appointment: Appointment) => {
      const appointmentDate = new Date(appointment.scheduledDate);
      return isSameDay(appointmentDate, date);
    });
  };

  // Get appointment time
  const getAppointmentTime = (appointment: Appointment) => {
    const date = new Date(appointment.scheduledDate);
    return format(date, "h:mm a");
  };

  // Get service type theme
  const getAppointmentTheme = (serviceType: string) => {
    const theme = getServiceTypeTheme(serviceType);
    return theme.color;
  };

  // Navigation functions
  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Drag and drop mutation
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, newDate, newStaff }: { appointmentId: number, newDate: Date, newStaff?: string }) => {
      const updateData: any = {
        scheduledDate: newDate.toISOString()
      };
      
      if (newStaff) {
        updateData.assignedCleaner = newStaff;
      }
      
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Updated",
        description: "The appointment has been successfully rescheduled.",
      });
    },
    onError: (error) => {
      console.error("Error rescheduling appointment:", error);
      toast({
        title: "Error",
        description: "Failed to reschedule appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to parse time string to hours/minutes
  const parseTimeString = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    return { hours: hour24, minutes };
  };

  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const appointmentId = parseInt(result.draggableId);
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    // Parse destination - format: "day-YYYY-MM-DD", "time-8:00 AM", or "staff-ID"
    const destId = result.destination.droppableId;
    const [destType, ...destValueParts] = destId.split('-');
    const destValue = destValueParts.join('-'); // Rejoin in case time has dashes
    
    let newDate: Date;
    
    if (destType === 'day') {
      // Moving to a different day (week view)
      // Parse the date string safely to avoid timezone issues
      const [year, month, day] = destValue.split('-').map(Number);
      newDate = new Date(year, month - 1, day); // month is 0-indexed
      
      const currentTime = new Date(appointment.scheduledDate);
      newDate.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
      
    } else if (destType === 'time') {
      // Moving to a different time slot (day view)
      // Use current date but avoid timezone issues
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const day = currentDate.getDate();
      newDate = new Date(year, month, day);
      
      const { hours, minutes } = parseTimeString(destValue);
      newDate.setHours(hours, minutes, 0, 0);
      
    } else if (destType === 'staff') {
      // Reassigning to different staff
      rescheduleAppointmentMutation.mutate({
        appointmentId,
        newDate: new Date(appointment.scheduledDate),
        newStaff: destValue
      });
      return;
    } else {
      return; // Unknown destination type
    }

    // Check for REAL staff conflicts (same staff, overlapping times)
    const appointmentDurationMs = (appointment.duration || 120) * 60000; // Default 2 hours
    const conflictingAppointment = appointments.find(apt => 
      apt.id !== appointmentId &&
      apt.assignedCleaner === appointment.assignedCleaner &&
      (() => {
        const aptStart = new Date(apt.scheduledDate).getTime();
        const aptEnd = aptStart + (apt.duration || 120) * 60000;
        const newStart = newDate.getTime();
        const newEnd = newStart + appointmentDurationMs;
        
        // Check for actual time overlap (not just same day)
        return (newStart < aptEnd && newEnd > aptStart);
      })()
    );

    if (conflictingAppointment) {
      const conflictTime = format(new Date(conflictingAppointment.scheduledDate), "h:mm a");
      toast({
        title: "Staff Conflict",
        description: `This cleaner is already assigned to another job at ${conflictTime} on this day.`,
        variant: "destructive",
      });
      return;
    }
    
    // Proceed with rescheduling
    rescheduleAppointmentMutation.mutate({
      appointmentId,
      newDate
    });
  }, [appointments, rescheduleAppointmentMutation, currentDate]);

  if (appointmentsLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading schedule...</div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="p-6 space-y-6">
        {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-gray-600 mt-1">
            Manage appointments and staff assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "week" ? "day" : "week")}
          >
            {viewMode === "week" ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
            {viewMode === "week" ? "Day View" : "Week View"}
          </Button>
          <Button onClick={() => setShowNewJobModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by client name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Staff Filter */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {mockStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className={`${staff.color} text-white text-xs`}>
                            {staff.avatar}
                          </AvatarFallback>
                        </Avatar>
                        {staff.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="standard">Standard Clean</SelectItem>
                  <SelectItem value="deep">Deep Clean</SelectItem>
                  <SelectItem value="move_in">Move In/Out</SelectItem>
                  <SelectItem value="office">Office Clean</SelectItem>
                  <SelectItem value="post_construction">Post Construction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Band */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 mr-2">Staff:</span>
            <Button
              variant={selectedStaff === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStaff("all")}
            >
              All ({filteredAppointments.length})
            </Button>
            {mockStaff.map((staff) => {
              const staffAppointments = filteredAppointments.filter(
                (apt: Appointment) => apt.assignedCleaner === staff.id.toString()
              );
              return (
                <Button
                  key={staff.id}
                  variant={selectedStaff === staff.id.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStaff(staff.id.toString())}
                  className="flex items-center gap-2"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className={`${staff.color} text-white text-xs`}>
                      {staff.avatar}
                    </AvatarFallback>
                  </Avatar>
                  {staff.name} ({staffAppointments.length})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={viewMode === "week" ? goToPreviousWeek : () => setCurrentDate(subDays(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={viewMode === "week" ? goToNextWeek : () => setCurrentDate(addDays(currentDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {viewMode === "week" ? (
            `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
          ) : (
            format(currentDate, "EEEE, MMMM d, yyyy")
          )}
        </h2>
      </div>

      {/* Calendar Grid */}
      {viewMode === "week" ? (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isCurrentDay = isToday(day);
            const dayId = format(day, 'yyyy-MM-dd');
            
            return (
              <Droppable key={dayId} droppableId={`day-${dayId}`}>
                {(provided, snapshot) => (
                  <Card 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[400px] ${isCurrentDay ? 'ring-2 ring-blue-500' : ''} ${
                      snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span className={isCurrentDay ? 'text-blue-600' : ''}>
                          {format(day, "EEE")}
                        </span>
                        <span className={`text-lg ${isCurrentDay ? 'text-blue-600 font-bold' : ''}`}>
                          {format(day, "d")}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dayAppointments.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm py-8">
                          No appointments
                        </div>
                      ) : (
                        dayAppointments.map((appointment: Appointment, index) => {
                          const assignedStaffMember = mockStaff.find(s => s.id.toString() === appointment.assignedCleaner);
                          const serviceTheme = getAppointmentTheme(appointment.serviceType);
                        
                        return (
                          <Draggable 
                            key={appointment.id} 
                            draggableId={appointment.id.toString()} 
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-3 rounded-lg border-l-4 ${serviceTheme} bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                                  snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm text-gray-900">
                                      {appointment.customerName}
                                    </h4>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                      <Clock className="w-3 h-3" />
                                      {getAppointmentTime(appointment)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-4 h-4 text-gray-400" />
                                    </div>
                                    {assignedStaffMember && (
                                      <Avatar className="w-6 h-6">
                                        <AvatarFallback className={`${assignedStaffMember.color} text-white text-xs`}>
                                          {assignedStaffMember.avatar}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{appointment.address}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    {displayPhoneNumber(appointment.customerPhone)}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {appointment.serviceType.replace('_', ' ')}
                                  </Badge>
                                  <Badge 
                                    variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {appointment.status}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })
                    )}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          );
          })}
        </div>
      ) : (
        /* Day View */
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {timeSlots.map((time) => {
                const timeAppointments = getAppointmentsForDay(currentDate).filter(apt => {
                  const aptTime = getAppointmentTime(apt);
                  return aptTime === time;
                });
                
                return (
                  <Droppable key={time} droppableId={`time-${time}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`border border-gray-200 rounded-lg p-3 min-h-[60px] flex items-center ${
                          snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                        }`}
                      >
                        <div className="w-20 text-sm font-medium text-gray-600 mr-4">
                          {time}
                        </div>
                        <div className="flex-1 flex gap-2 flex-wrap">
                          {timeAppointments.map((appointment: Appointment, index) => {
                            const theme = getAppointmentTheme(appointment.serviceType);
                            const staffMember = mockStaff.find(s => s.id.toString() === appointment.assignedCleaner);
                            return (
                              <Draggable
                                key={appointment.id}
                                draggableId={appointment.id.toString()}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 rounded-lg border ${theme} cursor-move transition-all min-w-[250px] ${
                                      snapshot.isDragging ? 'rotate-2 shadow-lg' : 'hover:shadow-md'
                                    }`}
                                  >
                                    <div className="font-medium">{appointment.customerName}</div>
                                    <div className="text-sm opacity-80 truncate">
                                      {appointment.address}
                                    </div>
                                    <div className="text-sm opacity-80">
                                      {appointment.customerPhone}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Avatar className="w-5 h-5">
                                        <AvatarFallback className={`${staffMember?.color} text-white text-xs`}>
                                          {staffMember?.avatar}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs">{staffMember?.name}</span>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Job Modal */}
      <ScheduleJobModal
        open={showNewJobModal}
        onOpenChange={setShowNewJobModal}
        lead={selectedLead}
      />
      </div>
    </DragDropContext>
  );
}