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
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"
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
  const [isDragging, setIsDragging] = useState(false);

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
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

  // Filter appointments with memo for performance
  const filteredAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    
    return appointments.filter((appointment) => {
      const matchesStaff = selectedStaff === "all" || (appointment.assignedCleaner || "unassigned") === selectedStaff;
      const matchesServiceType = selectedServiceType === "all" || appointment.serviceType === selectedServiceType;
      const matchesSearch = searchQuery === "" || 
        appointment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStaff && matchesServiceType && matchesSearch;
    });
  }, [appointments, selectedStaff, selectedServiceType, searchQuery]);

  // Get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    return filteredAppointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.scheduledDate);
      return isSameDay(appointmentDate, date);
    });
  };

  // Get appointment time
  const getAppointmentTime = (appointment: Appointment) => {
    const date = new Date(appointment.scheduledDate);
    return format(date, "h:mm a");
  };

  // CHANGED: Calculate appointment height based on duration
  const getAppointmentHeight = (appointment: Appointment) => {
    const duration = appointment.duration || 120; // Default 2 hours
    const minutesPerSlot = 30;
    const slotsNeeded = Math.max(1, Math.ceil(duration / minutesPerSlot));
    return slotsNeeded * 40; // 40px per 30-min slot
  };

  // CHANGED: Calculate appointment position within time grid
  const getAppointmentPosition = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.scheduledDate);
    const minutes = appointmentDate.getMinutes();
    const offsetPercentage = (minutes / 30) * 100; // Position within 30-min slot
    return offsetPercentage;
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

  // Optimistic drag and drop mutation with instant UI updates
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
    onMutate: async ({ appointmentId, newDate, newStaff }) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/appointments"] });

      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(["/api/appointments"]);

      // Optimistically update to new value IMMEDIATELY
      queryClient.setQueryData(["/api/appointments"], (old: any[]) => {
        if (!old) return [];
        return old.map(apt => 
          apt.id === appointmentId 
            ? { 
                ...apt, 
                scheduledDate: newDate.toISOString(),
                ...(newStaff && { assignedCleaner: newStaff })
              }
            : apt
        );
      });

      // Return a context object with the snapshotted value
      return { previousAppointments };
    },
    onSuccess: (data) => {
      // Silently update with server response - no toast to reduce lag
      queryClient.setQueryData(["/api/appointments"], (old: any[]) => {
        if (!old) return [data];
        return old.map(apt => apt.id === data.id ? data : apt);
      });
    },
    onError: (err, variables, context) => {
      // If mutation fails, roll back to previous state
      if (context?.previousAppointments) {
        queryClient.setQueryData(["/api/appointments"], context.previousAppointments);
      }
      
      // Refetch on error to ensure we have correct state
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      
      console.error("Error rescheduling appointment:", err);
      toast({
        title: "Error",
        description: "Failed to reschedule appointment. Changes have been reverted.",
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

  // Handle drag start for visual feedback
  const handleDragStart = useCallback((start: any) => {
    setIsDragging(true);
    const appointmentId = parseInt(start.draggableId);
    const appointment = appointments.find(apt => apt.id === appointmentId);
    setDraggedAppointment(appointment || null);
  }, [appointments]);

  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    setIsDragging(false);
    setDraggedAppointment(null); // Clear dragged appointment
    if (!result.destination) return;
    
    const appointmentId = parseInt(result.draggableId);
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    // Parse destination - format: "time-YYYY-MM-DD-8:00 AM", "time-8:00 AM", or "staff-ID"
    const destId = result.destination.droppableId;
    
    let destType: string;
    let destValue: string;
    let destDate: string | null = null;
    
    if (destId.startsWith('time-') && destId.includes('-202')) {
      // New time grid format: "time-2024-01-25-8:00 AM"
      const parts = destId.split('-');
      destType = 'time-grid';
      destDate = `${parts[1]}-${parts[2]}-${parts[3]}`; // "2024-01-25"
      destValue = parts.slice(4).join('-'); // "8:00 AM"
    } else {
      // Legacy formats
      const [type, ...valueParts] = destId.split('-');
      destType = type;
      destValue = valueParts.join('-');
    }
    
    let newDate: Date;
    
    if (destType === 'time-grid') {
      // Moving within time grid (week view)
      const [year, month, day] = destDate!.split('-').map(Number);
      newDate = new Date(year, month - 1, day); // month is 0-indexed
      
      const { hours, minutes } = parseTimeString(destValue);
      newDate.setHours(hours, minutes, 0, 0);
      
    } else if (destType === 'day') {
      // Moving to a different day (legacy week view)
      const [year, month, day] = destValue.split('-').map(Number);
      newDate = new Date(year, month - 1, day);
      
      const currentTime = new Date(appointment.scheduledDate);
      newDate.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
      
    } else if (destType === 'time') {
      // Moving to a different time slot (day view)
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
      (apt.assignedCleaner || "unassigned") === (appointment.assignedCleaner || "unassigned") &&
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
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                (apt) => (apt.assignedCleaner || "unassigned") === staff.id.toString()
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
        /* Time Grid View - Outlook Style */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            {/* Time Column Header */}
            <div className="p-3 bg-gray-50 border-r border-gray-200"></div>
            {/* Day Headers */}
            {weekDays.map((day) => {
              const isCurrentDay = isToday(day);
              return (
                <div key={format(day, 'yyyy-MM-dd')} className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${isCurrentDay ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className={`text-sm font-medium ${isCurrentDay ? 'text-blue-600' : 'text-gray-700'}`}>
                    {format(day, "EEE")}
                  </div>
                  <div className={`text-lg font-semibold ${isCurrentDay ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Time Grid Body */}
          <div className="relative">
            {timeSlots.map((time, timeIndex) => {
              const isHourBoundary = time.endsWith(':00 AM') || time.endsWith(':00 PM');
              
              return (
                <div key={time} className={`grid grid-cols-8 ${isHourBoundary ? 'border-t border-gray-300' : 'border-t border-gray-100'}`}>
                  {/* Time Label */}
                  <div className={`p-2 text-right text-xs text-gray-600 bg-gray-50 border-r border-gray-200 ${isHourBoundary ? 'font-medium' : ''}`} style={{ minHeight: '40px' }}>
                    {isHourBoundary ? time : ''}
                  </div>
                  
                  {/* Day Columns */}
                  {weekDays.map((day) => {
                    const dayId = format(day, 'yyyy-MM-dd');
                    const dayAppointments = getAppointmentsForDay(day).filter(apt => {
                      const aptTime = getAppointmentTime(apt);
                      return aptTime === time;
                    });
                    
                    return (
                      <Droppable key={`${dayId}-${time}`} droppableId={`time-${dayId}-${time}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`border-r border-gray-200 last:border-r-0 relative transition-all duration-75 ${
                              snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                            }`}
                            style={{ minHeight: '40px' }}
                          >
                            {dayAppointments.map((appointment, index) => {
                              const assignedStaffMember = mockStaff.find(s => s.id.toString() === (appointment.assignedCleaner || "unassigned"));
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
                                      {...provided.dragHandleProps}
                                      className={`absolute inset-x-1 p-2 rounded ${serviceTheme} text-white text-xs cursor-pointer transition-transform duration-100 ease-out ${
                                        snapshot.isDragging ? 'shadow-2xl scale-110 rotate-3 z-50' : 'hover:shadow-md'
                                      }`}
                                      style={{ 
                                        ...provided.draggableProps.style,
                                        height: `${getAppointmentHeight(appointment)}px`, // CHANGED: Dynamic height based on duration
                                        top: `${getAppointmentPosition(appointment)}%`, // CHANGED: Position within slot
                                        zIndex: snapshot.isDragging ? 1000 : 1,
                                        transform: snapshot.isDragging 
                                          ? `${provided.draggableProps.style?.transform || ''} rotate(3deg) scale(1.1)`
                                          : provided.draggableProps.style?.transform
                                      }}
                                    >
                                      <div className="font-medium truncate">{appointment.customerName}</div>
                                      <div className="text-xs opacity-90 truncate">{appointment.address}</div>
                                      {assignedStaffMember && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <div className="w-3 h-3 bg-white bg-opacity-30 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-bold">{assignedStaffMember.avatar.charAt(0)}</span>
                                          </div>
                                          <span className="text-xs opacity-90 truncate">{assignedStaffMember.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              );
            })}
          </div>
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
                        className={`border border-gray-200 rounded-lg p-3 min-h-[60px] flex items-center transition-all duration-75 ${
                          snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300 shadow-md scale-[1.02]' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-20 text-sm font-medium text-gray-600 mr-4">
                          {time}
                        </div>
                        <div className="flex-1 flex gap-2 flex-wrap">
                          {timeAppointments.map((appointment, index) => {
                            const theme = getAppointmentTheme(appointment.serviceType);
                            const staffMember = mockStaff.find(s => s.id.toString() === (appointment.assignedCleaner || "unassigned"));
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
                                    className={`p-3 rounded-lg border ${theme} cursor-move transition-all duration-100 min-w-[250px] ${
                                      snapshot.isDragging ? 'rotate-2 shadow-xl scale-105 z-50' : 'hover:shadow-md'
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