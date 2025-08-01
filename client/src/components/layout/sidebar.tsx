import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Plus,
  LogOut
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomerWidget } from "@/components/widget/customer-widget";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const { user, logoutMutation } = useAuth();

  const menuItems = [
    {
      icon: BarChart3,
      label: "Dashboard",
      href: "/dashboard",
      active: location === "/" || location === "/dashboard",
    },
    {
      icon: Users,
      label: "Leads",
      href: "/leads",
      active: location === "/leads",
      badge: "5",
      badgeVariant: "bg-blue-500 text-white" as const, // CHANGED: Standardized to blue
    },
    {
      icon: Calendar,
      label: "Schedule",
      href: "/schedule",
      active: location === "/schedule",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      href: "/messages",
      active: location === "/messages",
      badge: "3",
      badgeVariant: "bg-blue-500 text-white" as const, // CHANGED: Standardized to blue
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
      active: location === "/settings",
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full bg-white shadow-lg border-r border-gray-200 z-50 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
          ${isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">CleanFlow</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-2"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Quick Action - New Lead */}
          <div className="mb-6">
            <Dialog open={isWidgetOpen} onOpenChange={setIsWidgetOpen}>
              <DialogTrigger asChild>
                <Button 
                  className={`w-full bg-gray-200 text-gray-700 hover:bg-gray-300 ${
                    isCollapsed ? 'px-2' : 'px-4 pl-4'  // CHANGED: Grey background + icon indentation
                  }`}
                  size={isCollapsed ? "sm" : "default"}
                  title={isCollapsed ? "Add Leads" : undefined}
                >
                  <Plus className={`w-4 h-4 ${isCollapsed ? 'w-6 h-6' : ''}`} /> {/* CHANGED: Larger icon when collapsed */}
                  {!isCollapsed && <span className="ml-2">Add Leads</span>} {/* CHANGED: Updated label */}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Customer Lead Capture</DialogTitle>
                </DialogHeader>
                <CustomerWidget onSuccess={() => setIsWidgetOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Menu Items */}
          <nav className="space-y-2">
            {menuItems.map((item) => (
              item.href === "#" ? (
                <div
                  key={item.label}
                  className={`
                    px-3 py-2 rounded-lg flex items-center transition-colors cursor-pointer
                    ${item.active ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={`${isCollapsed ? 'w-6 h-6 text-xl' : 'w-5 h-5 mr-3'}`} /> {/* CHANGED: Larger icons when collapsed */}
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge className={`text-xs px-2 py-1 ${item.active ? 'bg-white text-blue-600' : item.badgeVariant}`}> {/* CHANGED: White badge for active items */}
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`
                    px-3 py-2 rounded-lg flex items-center transition-colors
                    ${item.active ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={`${isCollapsed ? 'w-6 h-6 text-xl' : 'w-5 h-5 mr-3'}`} /> {/* CHANGED: Larger icons when collapsed */}
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge className={`text-xs px-2 py-1 ${item.active ? 'bg-white text-blue-600' : item.badgeVariant}`}> {/* CHANGED: White badge for active items */}
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              )
            ))}
          </nav>
          
          {/* Quick Stats Card - Only show when expanded */}
          {!isCollapsed && (
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
          )}
        </div>

        {/* User Profile - Bottom */}
        <div className="border-t border-gray-200 p-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || 'user@cleanflow.com'}</p>
              </div>
            )}
          </div>
          
          {/* Logout Button */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
            </Button>
          )}
          
          {isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 justify-center text-gray-600 hover:text-red-600 hover:bg-red-50"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}