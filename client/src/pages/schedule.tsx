import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Plus, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks } from "date-fns";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import type { Lead, Appointment } from "@shared/schema";

// Mock team data for now - will be replaced with actual API
const mockTeamMembers = [
  { id: 1, name: "Sarah Johnson", role: "Team Lead", avatar: "SJ", color: "bg-blue-500" },
  { id: 2, name: "Mike Chen", role: "Cleaner", avatar: "MC", color: "bg-green-500" },
  { id: 3, name: "Lisa Rodriguez", role: "Cleaner", avatar: "LR", color: "bg-purple-500" },
  { id: 4, name: "David Kim", role: "Cleaner", avatar: "DK", color: "bg-orange-500" },
];

const serviceTypeColors = {
  standard: "bg-blue-100 border-blue-300 text-blue-800",
  deep: "bg-green-100 border-green-300 text-green-800",
  move_in: "bg-purple-100 border-purple-300 text-purple-800",
  move_out: "bg-orange-100 border-orange-300 text-orange-800",
  office: "bg-indigo-100 border-indigo-300 text-indigo-800",
  post_construction: "bg-red-100 border-red-300 text-red-800",
};

const timeSlots = Array.from({ length: 10 }, (_, i) => ({
  hour: i + 8,
  label: `${i + 8}:00 ${i + 8 < 12 ? 'AM' : 'PM'}`,
  time: `${i + 8}:00`,
}));

export default function SchedulePage() {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("");

  // Fetch appointments and leads
  const { data: appointments = [], refetch: refetchAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Generate week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentWeek]);

  // Filter appointments based on current filters
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      if (selectedStaff && apt.assignedCleaner !== selectedStaff.toString()) return false;
      if (serviceFilter && apt.serviceType !== serviceFilter) return false;
      if (searchQuery) {
        const lead = leads.find(l => l.id === apt.leadId);
        if (!lead) return false;
        const searchLower = searchQuery.toLowerCase();
        return (
          lead.name.toLowerCase().includes(searchLower) ||
          lead.address?.toLowerCase().includes(searchLower) ||
          lead.phone.includes(searchQuery)
        );
      }
      return true;
    });
  }, [appointments, selectedStaff, serviceFilter, searchQuery, leads]);

  // Group appointments by day and time
  const appointmentsByDay = useMemo(() => {
    const grouped: Record<string, Record<string, Appointment[]>> = {};
    
    filteredAppointments.forEach(apt => {
      const day = format(new Date(apt.scheduledAt), 'yyyy-MM-dd');
      const hour = format(new Date(apt.scheduledAt), 'H');
      
      if (!grouped[day]) grouped[day] = {};
      if (!grouped[day][hour]) grouped[day][hour] = [];
      
      grouped[day][hour].push(apt);
    });
    
    return grouped;
  }, [filteredAppointments]);

  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    const appointmentId = parseInt(draggableId.replace('appointment-', ''));
    const [, newDay, newHour] = destination.droppableId.split('-');
    const newDateTime = new Date(`${newDay}T${newHour.padStart(2, '0')}:00`);
    
    // Update appointment time
    toast({
      title: "Job rescheduled",
      description: `Moved to ${format(newDateTime, 'MMM d, h:mm a')}`,
    });
    
    // TODO: Call API to update appointment
    refetchAppointments();
  }, [toast, refetchAppointments]);

  // Staff selector component
  const StaffSelector = () => (
    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 overflow-x-auto">
        <Button
          variant={selectedStaff === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedStaff(null)}
          className="flex-shrink-0"
        >
          All Staff
        </Button>
        {mockTeamMembers.map(member => (
          <Button
            key={member.id}
            variant={selectedStaff === member.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStaff(member.id)}
            className="flex-shrink-0 flex items-center gap-2"
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className={`${member.color} text-white text-xs`}>
                {member.avatar}
              </AvatarFallback>
            </Avatar>
            {member.name}
          </Button>
        ))}
      </div>
    </div>
  );

  // Job block component
  const JobBlock = ({ appointment, lead }: { appointment: Appointment; lead?: Lead }) => {
    const serviceType = appointment.serviceType || 'standard';
    const colorClass = serviceTypeColors[serviceType as keyof typeof serviceTypeColors] || serviceTypeColors.standard;
    
    return (
      <div className={`p-2 rounded border-l-4 text-xs ${colorClass} hover:shadow-md transition-shadow`}>
        <div className="font-medium truncate">{lead?.name || 'Unknown Client'}</div>
        <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3" />
          {format(new Date(appointment.scheduledAt), 'h:mm a')}
        </div>
        {lead?.address && (
          <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{lead.address}</span>
          </div>
        )}
      </div>
    );
  };

  // Week view component
  const WeekView = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Time column header */}
        <div className="bg-gray-50 p-3 text-xs font-medium text-gray-500">
          Time
        </div>
        
        {/* Day headers */}
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className="bg-white p-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setSelectedDay(day);
              setViewMode('day');
            }}
          >
            <div className="text-xs text-gray-500">
              {format(day, 'EEE')}
            </div>
            <div className={`text-lg font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
        
        {/* Time slots */}
        {timeSlots.map(slot => (
          <div key={slot.hour} className="contents">
            {/* Time label */}
            <div className="bg-gray-50 p-3 text-xs text-gray-500 border-r border-gray-200">
              {slot.label}
            </div>
            
            {/* Day columns */}
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointmentsByDay[dayKey]?.[slot.hour.toString()] || [];
              
              return (
                <Droppable key={`${dayKey}-${slot.hour}`} droppableId={`slot-${dayKey}-${slot.hour}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-white p-2 min-h-[80px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        {dayAppointments.map((apt, index) => {
                          const lead = leads.find(l => l.id === apt.leadId);
                          return (
                            <Draggable
                              key={apt.id}
                              draggableId={`appointment-${apt.id}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`${snapshot.isDragging ? 'rotate-2 scale-105' : ''}`}
                                >
                                  <JobBlock appointment={apt} lead={lead} />
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
        ))}
      </div>
    </DragDropContext>
  );

  // Day view component (simplified for now)
  const DayView = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{format(selectedDay, 'EEEE, MMMM d, yyyy')}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Back to Week
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-gray-500 text-center py-8">
          Day view with 15-minute slots - Coming soon
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-3">
              {format(currentWeek, 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button className="ml-4">
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Services</SelectItem>
              <SelectItem value="standard">Standard Clean</SelectItem>
              <SelectItem value="deep">Deep Clean</SelectItem>
              <SelectItem value="move_in">Move-in Clean</SelectItem>
              <SelectItem value="move_out">Move-out Clean</SelectItem>
              <SelectItem value="office">Office Clean</SelectItem>
              <SelectItem value="post_construction">Post-Construction</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Staff Selector */}
      <StaffSelector />

      {/* Calendar Views */}
      {viewMode === 'week' ? <WeekView /> : <DayView />}
    </div>
  );
}