import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, ExternalLink, Phone, MoreVertical } from "lucide-react";
import type { Appointment } from "@shared/schema";

export function CalendarView() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments', today],
    queryFn: async () => {
      const response = await fetch(`/api/appointments?date=${today}`);
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string }> = {
      pending: { className: "bg-amber-50 text-amber-700 border-amber-200" },
      confirmed: { className: "bg-green-50 text-green-700 border-green-200" },
      in_progress: { className: "bg-blue-50 text-blue-700 border-blue-200" },
      completed: { className: "bg-gray-50 text-gray-700 border-gray-200" },
      cancelled: { className: "bg-red-50 text-red-700 border-red-200" },
    };
    
    const config = variants[status] || variants.pending;
    return (
      <Badge variant="outline" className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      }),
      period: date.getHours() >= 12 ? 'PM' : 'AM'
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today's Schedule</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Add Appointment
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Calendar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No appointments scheduled for today
            </div>
          ) : (
            appointments?.map((appointment: Appointment) => {
              const timeInfo = formatTime(appointment.scheduledDate);
              
              return (
                <div
                  key={appointment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{timeInfo.time}</div>
                        <div className="text-xs text-gray-500">{timeInfo.period}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{appointment.customerName}</div>
                        <div className="text-sm text-gray-600">
                          {appointment.serviceType} - Duration: {appointment.duration || 120} min
                        </div>
                        <div className="text-sm text-gray-500">{appointment.address}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(appointment.status)}
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
