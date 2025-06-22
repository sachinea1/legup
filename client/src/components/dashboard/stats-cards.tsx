import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Calendar, DollarSign } from "lucide-react";

export function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/stats'],
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      const response = await fetch('/api/stats', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Leads",
      value: stats?.totalLeads || 0,
      change: stats?.totalLeads > 0 ? `${stats.newLeads} new this week` : "No leads yet",
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate || 0}%`,
      change: stats?.conversionRate > 0 ? "Based on closed deals" : "No conversions yet",
      icon: TrendingUp,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Active Bookings",
      value: stats?.activeBookings || 0,
      change: stats?.activeBookings > 0 ? `${stats.activeBookings} scheduled` : "No bookings yet",
      icon: Calendar,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Monthly Revenue",
      value: stats?.monthlyRevenue ? `$${stats.monthlyRevenue.toLocaleString()}` : "$0",
      change: stats?.monthlyRevenue > 0 ? "From completed jobs" : "No revenue yet",
      icon: DollarSign,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-green-600 text-sm mt-2">{stat.change}</p>
              </div>
              <div className={`${stat.iconBg} p-3 rounded-lg`}>
                <stat.icon className={`${stat.iconColor} w-6 h-6`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
