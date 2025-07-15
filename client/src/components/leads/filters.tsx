import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus } from "lucide-react";

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
  priorityFilter,
  onPriorityChange,
  serviceFilter,
  onServiceChange,
  sourceFilter,
  onSourceChange,
  onAddLead,
  totalLeads,
}: FiltersProps) {
  const clearFilters = () => {
    onSearchChange("");
    onPriorityChange("all");
    onServiceChange("all");
    onSourceChange("all");
  };

  const hasActiveFilters = searchQuery || priorityFilter !== "all" || serviceFilter !== "all" || sourceFilter !== "all";

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

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority-filter" className="text-sm font-medium text-gray-700">
            Priority
          </Label>
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger id="priority-filter">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">🔴 Urgent</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="normal">🔵 Normal</SelectItem>
              <SelectItem value="low">🟢 Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-filter" className="text-sm font-medium text-gray-700">
            Service Type
          </Label>
          <Select value={serviceFilter} onValueChange={onServiceChange}>
            <SelectTrigger id="service-filter">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="regular">Regular Cleaning</SelectItem>
              <SelectItem value="deep">Deep Cleaning</SelectItem>
              <SelectItem value="moveout">Move-out Cleaning</SelectItem>
              <SelectItem value="commercial">Commercial Cleaning</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source-filter" className="text-sm font-medium text-gray-700">
            Lead Source
          </Label>
          <Select value={sourceFilter} onValueChange={onSourceChange}>
            <SelectTrigger id="source-filter">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="widget">Widget</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="phone">Phone Call</SelectItem>
              <SelectItem value="manual">Manual Entry</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Actions</Label>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-1">
                <Filter className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}