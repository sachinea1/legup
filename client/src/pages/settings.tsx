import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Building2, Users, Shield, CreditCard, Settings, Trash2, UserPlus, Key } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

// Form schemas
const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const companyUpdateSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  timezone: z.string().optional(),
  businessHours: z.string().optional(),
  defaultServices: z.string().optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "manager"]),
});

type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
type PasswordChange = z.infer<typeof passwordChangeSchema>;
type CompanyUpdate = z.infer<typeof companyUpdateSchema>;
type InviteUser = z.infer<typeof inviteUserSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("personal");
  const [userToRemove, setUserToRemove] = useState<any>(null);

  // Queries
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", user?.organizationId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organizations/${user?.organizationId}`);
      return await res.json();
    },
    enabled: !!user?.organizationId && (user?.role === "admin" || user?.role === "manager"),
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["/api/organizations", user?.organizationId, "members"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organizations/${user?.organizationId}/members`);
      return await res.json();
    },
    enabled: !!user?.organizationId && (user?.role === "admin" || user?.role === "manager"),
  });

  const { data: invitations } = useQuery({
    queryKey: ["/api/organizations", user?.organizationId, "invitations"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organizations/${user?.organizationId}/invitations`);
      return await res.json();
    },
    enabled: !!user?.organizationId && (user?.role === "admin" || user?.role === "manager"),
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChange) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyUpdate) => {
      const res = await apiRequest("PATCH", `/api/organizations/${user?.organizationId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Company information updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", user?.organizationId] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update company", description: error.message, variant: "destructive" });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: InviteUser) => {
      const res = await apiRequest("POST", `/api/organizations/${user?.organizationId}/invite`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Invitation sent successfully" });
      inviteForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", user?.organizationId, "invitations"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/organizations/${user?.organizationId}/members/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "User removed successfully" });
      setUserToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", user?.organizationId, "members"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove user", description: error.message, variant: "destructive" });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: number; newRole: string }) => {
      const res = await apiRequest("PATCH", `/api/organizations/${user?.organizationId}/members/${userId}/role`, { role: newRole });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "User role updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", user?.organizationId, "members"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update user role", description: error.message, variant: "destructive" });
    },
  });

  // Forms
  const profileForm = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<PasswordChange>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const companyForm = useForm<CompanyUpdate>({
    resolver: zodResolver(companyUpdateSchema),
    defaultValues: {
      name: organization?.name || "",
      timezone: organization?.timezone || "",
      businessHours: organization?.businessHours || "",
      defaultServices: organization?.defaultServices || "",
    },
  });

  const inviteForm = useForm<InviteUser>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: "user",
    },
  });

  // Update form defaults when data loads
  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user, profileForm]);

  React.useEffect(() => {
    if (organization) {
      companyForm.reset({
        name: organization.name || "",
        timezone: organization.timezone || "",
        businessHours: organization.businessHours || "",
        defaultServices: organization.defaultServices || "",
      });
    }
  }, [organization, companyForm]);

  const canManageTeam = user?.role === "admin" || user?.role === "manager";
  const canManageOrganization = user?.role === "admin" || user?.role === "manager";
  const isAdmin = user?.role === "admin";

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Personal</span>
          </TabsTrigger>
          {canManageOrganization && (
            <TabsTrigger value="organization" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Organization</span>
            </TabsTrigger>
          )}
          {canManageTeam && (
            <TabsTrigger value="team" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Settings */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Role</Label>
                      <Input value={user?.role || ""} disabled className="bg-gray-50" />
                    </div>
                    <div>
                      <Label>Organization</Label>
                      <Input value={organization?.name || "No organization"} disabled className="bg-gray-50" />
                    </div>
                  </div>
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Settings */}
        {canManageOrganization && (
          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Manage your organization's basic information and settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...companyForm}>
                  <form onSubmit={companyForm.handleSubmit((data) => updateCompanyMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={companyForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={companyForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="America/New_York" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="businessHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Hours (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mon-Fri 9am-5pm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="defaultServices"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Services (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Deep Clean, Carpet Wash, Window Cleaning" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={updateCompanyMutation.isPending}>
                      {updateCompanyMutation.isPending ? "Updating..." : "Update Company Info"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Team Management */}
        {canManageTeam && (
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage your organization's team members and their roles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {teamMembers && teamMembers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        {isAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member: any) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            {isAdmin && member.id !== user?.id ? (
                              <Select
                                value={member.role}
                                onValueChange={(newRole) => changeRoleMutation.mutate({ userId: member.id, newRole })}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="secondary">{member.role}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Active</Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              {member.id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setUserToRemove(member)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500">No team members found.</p>
                )}

                {invitations && invitations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Pending Invitations</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Invited</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation: any) => (
                          <TableRow key={invitation.id}>
                            <TableCell>{invitation.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{invitation.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Pending</Badge>
                            </TableCell>
                            <TableCell>{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invite Team Member</CardTitle>
                <CardDescription>
                  Send an invitation to a new team member.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit((data) => inviteUserMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="colleague@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={inviteUserMutation.isPending}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>
                  Overview of what each role can do in your organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>View & manage leads</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>✅</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Schedule appointments</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>✅</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>View team members</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>🚫</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Invite team members</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>🚫</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Manage roles</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>🚫</TableCell>
                      <TableCell>🚫</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Remove users</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>🚫</TableCell>
                      <TableCell>🚫</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Manage organization settings</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>✅</TableCell>
                      <TableCell>🚫</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Overview</CardTitle>
              <CardDescription>
                Manage your account security settings and view recent activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-gray-500">Last changed: Never</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setActiveTab("personal")}>
                  Change Password
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Account Status</p>
                    <p className="text-sm text-gray-500">Your account is secure</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Organization Access</p>
                    <p className="text-sm text-gray-500">Member of {organization?.name || "No organization"}</p>
                  </div>
                </div>
                <Badge variant="secondary">{user?.role}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove User Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.name} from your organization? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeUserMutation.mutate(userToRemove?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}