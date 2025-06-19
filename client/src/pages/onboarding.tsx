import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { organizationSetupSchema, acceptInvitationSchema, type OrganizationSetup, type AcceptInvitation } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Building2, Users, Clock, MapPin, Phone } from "lucide-react";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("create");

  // Organization creation form
  const createOrgForm = useForm({
    defaultValues: {
      name: "",
      slug: "",
      businessHours: [],
      timezone: "America/New_York",
      defaultServices: ["House Cleaning", "Deep Cleaning", "Move-in/Move-out Cleaning"],
      address: "",
      phone: ""
    }
  });

  // Invitation acceptance form
  const acceptForm = useForm({
    defaultValues: {
      token: ""
    }
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/organizations", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Organization created",
        description: "Your organization has been set up successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/invitations/accept", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted",
        description: "Welcome to your new organization!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Acceptance failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const onCreateOrg = (data: any) => {
    createOrgMutation.mutate(data);
  };

  const onAcceptInvitation = (data: any) => {
    acceptInvitationMutation.mutate(data);
  };

  if (user?.isOnboarded) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to CleanFlow</CardTitle>
          <CardDescription>
            Complete your setup to start managing your cleaning business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Create Organization
              </TabsTrigger>
              <TabsTrigger value="join" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Join Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Set up your organization</h3>
                <p className="text-sm text-muted-foreground">
                  Create your cleaning business profile and invite your team
                </p>
              </div>

              <Form {...createOrgForm}>
                <form onSubmit={createOrgForm.handleSubmit(onCreateOrg)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createOrgForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Sparkling Clean Services"
                              onChange={(e) => {
                                field.onChange(e);
                                createOrgForm.setValue("slug", generateSlug(e.target.value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createOrgForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="sparkling-clean-services" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createOrgForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Business Phone
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 123-4567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createOrgForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Timezone
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="America/New_York">Eastern Time</SelectItem>
                              <SelectItem value="America/Chicago">Central Time</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createOrgForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Business Address
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="123 Main St, City, State 12345"
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createOrgMutation.isPending}
                  >
                    {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="join" className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Join an existing team</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your invitation token to join your team
                </p>
              </div>

              <Form {...acceptForm}>
                <form onSubmit={acceptForm.handleSubmit(onAcceptInvitation)} className="space-y-4">
                  <FormField
                    control={acceptForm.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invitation Token</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter your invitation token"
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={acceptInvitationMutation.isPending}
                  >
                    {acceptInvitationMutation.isPending ? "Joining..." : "Join Team"}
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an invitation token? Contact your team administrator or{" "}
                <button 
                  onClick={() => setActiveTab("create")}
                  className="text-primary underline"
                >
                  create your own organization
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}