import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lead, InsertLead } from "@shared/schema";

export function useLeads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch leads
  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["/api/leads"],
    staleTime: 30 * 1000, // Cache for 30 seconds to prevent unnecessary refetches
  });

  // Update lead mutation (for any field updates)
  const updateLeadMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<InsertLead> }) => {
      return apiRequest("PATCH", `/api/leads/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error?.message || "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  // CHANGED: Enhanced status mutation with calendar-style optimistic pattern
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/leads/${data.id}/status`, { status: data.status });
      return response.json();
    },
    onMutate: async ({ id, status }) => {
      // CHANGED: Cancel outgoing refetches to prevent overwrites
      await queryClient.cancelQueries({ queryKey: ["/api/leads"] });

      // CHANGED: Snapshot the previous value for rollback
      const previousLeads = queryClient.getQueryData(["/api/leads"]);

      // CHANGED: Optimistically update immediately for instant UI feedback
      queryClient.setQueryData(["/api/leads"], (old: Lead[] = []) => 
        old.map(lead => 
          lead.id === id ? { ...lead, status } : lead
        )
      );

      // CHANGED: Return context for potential rollback
      return { previousLeads };
    },
    onSuccess: (updatedLead, variables) => {
      // CHANGED: Silently update with server response
      queryClient.setQueryData(["/api/leads"], (old: Lead[] = []) => 
        old.map(lead => 
          lead.id === variables.id ? updatedLead : lead
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: any, variables, context) => {
      // CHANGED: Rollback to snapshot on error
      if (context?.previousLeads) {
        queryClient.setQueryData(["/api/leads"], context.previousLeads);
      }
      
      // CHANGED: Refetch to ensure correct state
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      toast({
        title: "Status update failed",
        description: error?.message || "Failed to update lead status",
        variant: "destructive",
      });
    },
    // CHANGED: Always invalidate leads after settled to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: InsertLead) => {
      return apiRequest("POST", "/api/leads", leadData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Lead created",
        description: "New lead has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Create failed",
        description: error?.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  // Helper function to update lead with optimistic updates
  const updateLead = async (id: number, updates: Partial<InsertLead>) => {
    // Optimistic update
    queryClient.setQueryData(["/api/leads"], (oldData: Lead[] = []) => 
      oldData.map(lead => 
        lead.id === id ? { ...lead, ...updates } : lead
      )
    );

    try {
      await updateLeadMutation.mutateAsync({ id, updates });
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      throw error;
    }
  };

  // Helper function to update lead status with optimistic updates
  const updateLeadStatus = async (id: number, status: string) => {
    // Store snapshot for potential rollback
    const previousData = queryClient.getQueryData(["/api/leads"]) as Lead[];
    
    // Optimistic update - immediately update UI
    queryClient.setQueryData(["/api/leads"], (oldData: Lead[] = []) => 
      oldData.map(lead => 
        lead.id === id ? { ...lead, status } : lead
      )
    );

    try {
      await updateStatusMutation.mutateAsync({ id, status });
    } catch (error) {
      // Rollback to previous state on error
      queryClient.setQueryData(["/api/leads"], previousData);
      throw error;
    }
  };

  return {
    leads: leads as Lead[],
    isLoading,
    error,
    updateLead,
    updateLeadStatus,
    createLead: createLeadMutation.mutate,
    isUpdating: updateLeadMutation.isPending || updateStatusMutation.isPending,
    isCreating: createLeadMutation.isPending,
  };
}