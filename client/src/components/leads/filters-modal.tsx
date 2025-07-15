import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface FiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highPriorityOnly: boolean;
  onHighPriorityChange: (enabled: boolean) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
  assignedCleaner: string;
  onAssignedCleanerChange: (cleaner: string) => void;
}

export function FiltersModal({
  open,
  onOpenChange,
  highPriorityOnly,
  onHighPriorityChange,
  dateRange,
  onDateRangeChange,
  assignedCleaner,
  onAssignedCleanerChange,
}: FiltersModalProps) {
  const [localDateFrom, setLocalDateFrom] = useState<Date | undefined>(dateRange.from);
  const [localDateTo, setLocalDateTo] = useState<Date | undefined>(dateRange.to);

  const handleApplyFilters = () => {
    onDateRangeChange({ from: localDateFrom, to: localDateTo });
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    onHighPriorityChange(false);
    setLocalDateFrom(undefined);
    setLocalDateTo(undefined);
    onDateRangeChange({ from: undefined, to: undefined });
    onAssignedCleanerChange("all");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Leads</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* High Priority Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="high-priority" className="text-sm font-medium">
              Show High Priority Only
            </Label>
            <Switch
              id="high-priority"
              checked={highPriorityOnly}
              onCheckedChange={onHighPriorityChange}
            />
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localDateFrom ? format(localDateFrom, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localDateFrom}
                    onSelect={setLocalDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localDateTo ? format(localDateTo, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localDateTo}
                    onSelect={setLocalDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Assigned Cleaner */}
          <div className="space-y-2">
            <Label htmlFor="assigned-cleaner" className="text-sm font-medium">
              Assigned Cleaner
            </Label>
            <Select value={assignedCleaner} onValueChange={onAssignedCleanerChange}>
              <SelectTrigger>
                <SelectValue placeholder="All cleaners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cleaners</SelectItem>
                <SelectItem value="john">John Smith</SelectItem>
                <SelectItem value="sarah">Sarah Johnson</SelectItem>
                <SelectItem value="mike">Mike Davis</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleClearFilters} variant="outline" className="flex-1">
              Clear All
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}