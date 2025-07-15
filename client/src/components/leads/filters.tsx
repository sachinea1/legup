import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

interface FiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  serviceFilter: string;
  onServiceChange: (service: string) => void;
  sourceFilter: string;
  onSourceChange: (source: string) => void;
  onAddLead: () => void;
  totalLeads: number;
}

export function Filters({
  searchQuery,
  onSearchChange,
  onAddLead,
  totalLeads,
}: FiltersProps) {
  return (
    <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
      {/* Search and Add Lead */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search leads by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            {totalLeads} leads
          </span>
          <Button onClick={onAddLead} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
        </div>
      </div>
    </div>
  );
}