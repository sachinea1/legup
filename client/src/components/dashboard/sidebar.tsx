import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, Calendar, MessageSquare, Settings } from "lucide-react";

export function Sidebar() {
  const menuItems = [
    {
      icon: BarChart3,
      label: "Dashboard",
      href: "#",
      active: true,
    },
    {
      icon: Users,
      label: "Leads",
      href: "#",
      badge: "12",
      badgeVariant: "bg-amber-500 text-white" as const,
    },
    {
      icon: Calendar,
      label: "Calendar",
      href: "#",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      href: "#",
      badge: "3",
      badgeVariant: "bg-green-500 text-white" as const,
    },
    {
      icon: Settings,
      label: "Settings",
      href: "#",
    },
  ];

  return (
    <aside className="w-64 bg-white shadow-sm h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="p-6">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`px-3 py-2 rounded-lg flex items-center transition-colors ${
                item.active
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge className={`text-xs px-2 py-1 ${item.badgeVariant}`}>
                  {item.badge}
                </Badge>
              )}
            </a>
          ))}
        </nav>
        
        <Card className="mt-8">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Today's Bookings:</span>
                <span className="font-semibold text-blue-600">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Leads:</span>
                <span className="font-semibold text-amber-600">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">This Week Revenue:</span>
                <span className="font-semibold text-green-600">$2,450</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
