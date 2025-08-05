import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, MapPin, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Service form schemas
const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  basePrice: z.number().min(0, "Price must be positive"),
  priceType: z.enum(['fixed', 'per_room', 'per_sqft']),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const customFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  type: z.enum(['text', 'select', 'number']),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const locationSchema = z.object({
  address: z.string().min(1, "Address is required"),
  serviceRadius: z.number().min(1, "Service radius must be at least 1 mile"),
});

type ServiceData = z.infer<typeof serviceSchema>;
type CustomFieldData = z.infer<typeof customFieldSchema>;
type LocationData = z.infer<typeof locationSchema>;

interface ServicesSettingsProps {
  organization: any;
  onUpdate: (data: any) => void;
  isUpdating: boolean;
}

export function ServicesSettings({ organization, onUpdate, isUpdating }: ServicesSettingsProps) {
  const [editingService, setEditingService] = useState<(ServiceData & { id: string }) | null>(null);
  const [editingField, setEditingField] = useState<(CustomFieldData & { id: string }) | null>(null);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);

  const services = organization?.settings?.customServices || [];
  const customFields = organization?.settings?.customFields || [];
  const location = organization?.settings?.location;
  const serviceRadius = organization?.settings?.serviceRadius || 20;

  // Service form
  const serviceForm = useForm<ServiceData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      basePrice: 0,
      priceType: "fixed",
      description: "",
      isActive: true,
    },
  });

  // Custom field form
  const fieldForm = useForm<CustomFieldData>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      name: "",
      type: "text",
      options: [],
      required: false,
      isActive: true,
    },
  });

  // Location form
  const locationForm = useForm<LocationData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      address: location?.address || "",
      serviceRadius: serviceRadius,
    },
  });

  const handleSaveService = (data: ServiceData) => {
    const serviceId = editingService?.id || `service_${Date.now()}`;
    const updatedServices = editingService
      ? services.map((s: any) => s.id === serviceId ? { ...data, id: serviceId } : s)
      : [...services, { ...data, id: serviceId }];

    onUpdate({
      settings: {
        ...organization.settings,
        customServices: updatedServices,
      },
    });

    serviceForm.reset();
    setEditingService(null);
    setIsServiceDialogOpen(false);
  };

  const handleSaveField = (data: CustomFieldData) => {
    const fieldId = editingField?.id || `field_${Date.now()}`;
    const updatedFields = editingField
      ? customFields.map((f: any) => f.id === fieldId ? { ...data, id: fieldId } : f)
      : [...customFields, { ...data, id: fieldId }];

    onUpdate({
      settings: {
        ...organization.settings,
        customFields: updatedFields,
      },
    });

    fieldForm.reset();
    setEditingField(null);
    setIsFieldDialogOpen(false);
  };

  const handleSaveLocation = (data: LocationData) => {
    // In a real app, you'd geocode the address to get lat/lng
    onUpdate({
      settings: {
        ...organization.settings,
        location: {
          address: data.address,
          lat: 0, // Would be geocoded
          lng: 0, // Would be geocoded
        },
        serviceRadius: data.serviceRadius,
      },
    });
  };

  const handleDeleteService = (serviceId: string) => {
    const updatedServices = services.filter((s: any) => s.id !== serviceId);
    onUpdate({
      settings: {
        ...organization.settings,
        customServices: updatedServices,
      },
    });
  };

  const handleDeleteField = (fieldId: string) => {
    const updatedFields = customFields.filter((f: any) => f.id !== fieldId);
    onUpdate({
      settings: {
        ...organization.settings,
        customFields: updatedFields,
      },
    });
  };

  const handleToggleService = (serviceId: string, isActive: boolean) => {
    const updatedServices = services.map((s: any) => 
      s.id === serviceId ? { ...s, isActive } : s
    );
    onUpdate({
      settings: {
        ...organization.settings,
        customServices: updatedServices,
      },
    });
  };

  const handleToggleField = (fieldId: string, isActive: boolean) => {
    const updatedFields = customFields.map((f: any) => 
      f.id === fieldId ? { ...f, isActive } : f
    );
    onUpdate({
      settings: {
        ...organization.settings,
        customFields: updatedFields,
      },
    });
  };

  const editService = (service: any) => {
    setEditingService(service);
    serviceForm.reset(service);
    setIsServiceDialogOpen(true);
  };

  const editField = (field: any) => {
    setEditingField(field);
    fieldForm.reset(field);
    setIsFieldDialogOpen(true);
  };

  const addNewService = () => {
    setEditingService(null);
    serviceForm.reset({
      name: "",
      basePrice: 0,
      priceType: "fixed",
      description: "",
      isActive: true,
    });
    setIsServiceDialogOpen(true);
  };

  const addNewField = () => {
    setEditingField(null);
    fieldForm.reset({
      name: "",
      type: "text",
      options: [],
      required: false,
      isActive: true,
    });
    setIsFieldDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Location & Service Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Service Area
          </CardTitle>
          <CardDescription>
            Set your business location and service radius
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...locationForm}>
            <form onSubmit={locationForm.handleSubmit(handleSaveLocation)} className="space-y-4">
              <FormField
                control={locationForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main St, City, State 12345" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={locationForm.control}
                name="serviceRadius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Radius (miles)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1" 
                        max="100"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Service Area"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Custom Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Services & Pricing
              </CardTitle>
              <CardDescription>
                Manage your service offerings and pricing structure
              </CardDescription>
            </div>
            <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={addNewService}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? "Edit Service" : "Add New Service"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure your service details and pricing
                  </DialogDescription>
                </DialogHeader>
                <Form {...serviceForm}>
                  <form onSubmit={serviceForm.handleSubmit(handleSaveService)} className="space-y-4">
                    <FormField
                      control={serviceForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Deep Clean, Standard Clean" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={serviceForm.control}
                        name="basePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Price ($)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0" 
                                step="0.01"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={serviceForm.control}
                        name="priceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pricing Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select pricing type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Price</SelectItem>
                                <SelectItem value="per_room">Per Room</SelectItem>
                                <SelectItem value="per_sqft">Per Sq Ft</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={serviceForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Describe what's included in this service..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? "Saving..." : editingService ? "Update Service" : "Add Service"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {services.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service: any) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>${service.basePrice}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {service.priceType === 'fixed' ? 'Fixed' : 
                         service.priceType === 'per_room' ? 'Per Room' : 'Per Sq Ft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={(checked) => handleToggleService(service.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => editService(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No custom services configured. Add your first service to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Lead Fields</CardTitle>
              <CardDescription>
                Add custom fields to collect additional information from leads
              </CardDescription>
            </div>
            <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={addNewField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingField ? "Edit Custom Field" : "Add Custom Field"}
                  </DialogTitle>
                  <DialogDescription>
                    Create custom fields to collect specific information from leads
                  </DialogDescription>
                </DialogHeader>
                <Form {...fieldForm}>
                  <form onSubmit={fieldForm.handleSubmit(handleSaveField)} className="space-y-4">
                    <FormField
                      control={fieldForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Field Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Property Type, Pet Friendly" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fieldForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Field Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="text">Text Input</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="select">Dropdown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fieldForm.watch('type') === 'select' && (
                      <FormField
                        control={fieldForm.control}
                        name="options"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Options (one per line)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                value={field.value?.join('\n') || ''}
                                onChange={(e) => field.onChange(e.target.value.split('\n').filter(Boolean))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <div className="flex items-center space-x-2">
                      <FormField
                        control={fieldForm.control}
                        name="required"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Required Field</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? "Saving..." : editingField ? "Update Field" : "Add Field"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {customFields.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customFields.map((field: any) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {field.type === 'text' ? 'Text' : 
                         field.type === 'number' ? 'Number' : 'Dropdown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.required ? (
                        <Badge variant="destructive">Required</Badge>
                      ) : (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={field.isActive}
                        onCheckedChange={(checked) => handleToggleField(field.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => editField(field)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No custom fields configured. Add custom fields to collect additional lead information.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}