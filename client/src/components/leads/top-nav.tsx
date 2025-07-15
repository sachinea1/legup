import { Button } from "@/components/ui/button";
import { List, Kanban, Filter, Plus } from "lucide-react";

interface TopNavProps {
  viewMode: "list" | "kanban";
  onViewModeChange: (mode: "list" | "kanban") => void;
  onOpenFilters?: () => void;
  onAddLead?: () => void;
}

export function TopNav({ viewMode, onViewModeChange, onOpenFilters, onAddLead }: TopNavProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Add Lead and Filters buttons (left of tabs) */}
      <Button
        size="sm"
        onClick={onAddLead}
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Lead
      </Button>
      
      {viewMode === "kanban" && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenFilters}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("list")}
          className={`flex items-center gap-2 text-sm font-medium ${
            viewMode === "list" 
              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" 
              : "text-gray-700 hover:text-gray-900 hover:bg-white/50"
          }`}
        >
          <List className="w-4 h-4" />
          List View
        </Button>
        <Button
          variant={viewMode === "kanban" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("kanban")}
          className={`flex items-center gap-2 text-sm font-medium ${
            viewMode === "kanban" 
              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" 
              : "text-gray-700 hover:text-gray-900 hover:bg-white/50"
          }`}
        >
          <Kanban className="w-4 h-4" />
          Kanban View
        </Button>
      </div>
    </div>
  );
}