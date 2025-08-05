import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { InsertLead } from "@shared/schema";
import { manualLeadSchema } from "@shared/schema";

interface NewLeadFormProps {
  onSubmit: (data: InsertLead) => void;
  isLoading?: boolean;
}

export function NewLeadForm({ onSubmit, isLoading }: NewLeadFormProps) {
  const { user } = useAuth();

  // Fetch organization data to get custom services
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", user?.organizationId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organizations/${user?.organizationId}`);
      return await res.json();
    },
    enabled: !!user?.organizationId,
  });

  const customServices = organization?.settings?.customServices?.filter((s: any) => s.isActive) || [];
  const customFields = organization?.settings?.customFields?.filter((f: any) => f.isActive) || [];

  const form = useForm<InsertLead>({
    resolver: zodResolver(manualLeadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      serviceType: customServices.length > 0 ? customServices[0]?.name || "regular" : "regular",
      rooms: "",
      status: "new",
      priority: "normal",
      notes: "",
      estimatedValue: undefined,
    },
  });

  const handleSubmit = (data: InsertLead) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Customer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="customer@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Service Type */}
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customServices.length > 0 ? (
                      customServices.map((service: any) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name} - ${service.basePrice}
                          {service.priceType === 'per_room' ? '/room' : 
                           service.priceType === 'per_sqft' ? '/sqft' : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="regular">Regular Cleaning</SelectItem>
                        <SelectItem value="deep">Deep Cleaning</SelectItem>
                        <SelectItem value="moveout">Move-out Cleaning</SelectItem>
                        <SelectItem value="commercial">Commercial Cleaning</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rooms */}
          <FormField
            control={form.control}
            name="rooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rooms</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 2 bed, 1 bath" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Priority */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="normal">🔵 Normal</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estimated Value */}
          <FormField
            control={form.control}
            name="estimatedValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Value</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="150" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


        </div>

        {/* Address */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, City, State 12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFields.map((field: any) => (
                <div key={field.id}>
                  <Label className="text-sm font-medium">
                    {field.name} {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {field.type === 'text' && (
                    <Input
                      placeholder={`Enter ${field.name.toLowerCase()}`}
                      className="mt-1"
                    />
                  )}
                  {field.type === 'number' && (
                    <Input
                      type="number"
                      placeholder={`Enter ${field.name.toLowerCase()}`}
                      className="mt-1"
                    />
                  )}
                  {field.type === 'select' && field.options && (
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option: string) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional notes about the lead..."
                  className="min-h-20"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Lead"}
          </Button>
        </div>
      </form>
    </Form>
  );
}