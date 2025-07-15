import { Button } from "@/components/ui/button";
import { List, Kanban } from "lucide-react";

interface TopNavProps {
  viewMode: "list" | "kanban";
  onViewModeChange: (mode: "list" | "kanban") => void;
}

export function TopNav({ viewMode, onViewModeChange }: TopNavProps) {
  return (
    <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50 w-fit">
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("list")}
        className={`flex items-center gap-2 ${
          viewMode === "list" 
            ? "bg-white shadow-sm border-gray-200" 
            : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
        }`}
      >
        <List className="w-4 h-4" />
        List View
      </Button>
      <Button
        variant={viewMode === "kanban" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("kanban")}
        className={`flex items-center gap-2 ${
          viewMode === "kanban" 
            ? "bg-white shadow-sm border-gray-200" 
            : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
        }`}
      >
        <Kanban className="w-4 h-4" />
        Kanban View
      </Button>
    </div>
  );
}