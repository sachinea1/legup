import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Home, Sparkles, Package, Shield, Star, Clock } from "lucide-react";
import { widgetFormSchema, type WidgetFormData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomerWidgetProps {
  standalone?: boolean;
  onSuccess?: () => void;
}

export function CustomerWidget({ standalone = false, onSuccess }: CustomerWidgetProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const { toast } = useToast();

  const form = useForm<WidgetFormData>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      serviceType: undefined,
      rooms: "",
      preferredDate: "",
      address: "",
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: WidgetFormData) => {
      return apiRequest("POST", "/api/leads", data);
    },
    onSuccess: () => {
      toast({
        title: "Quote Request Submitted!",
        description: "We'll contact you soon to schedule your cleaning service.",
      });
      onSuccess?.();
      form.reset();
      setCurrentStep(1);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const progress = (currentStep / totalSteps) * 100;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: WidgetFormData) => {
    await createLeadMutation.mutateAsync(data);
  };

  const validateStep = () => {
    const values = form.getValues();
    switch (currentStep) {
      case 1:
        return values.name && values.phone;
      case 2:
        return values.serviceType;
      case 3:
        return values.rooms && values.address;
      case 4:
        return values.preferredDate;
      default:
        return false;
    }
  };

  return (
    <Card className="max-w-md mx-auto bg-white shadow-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Your Free Quote</h3>
          <p className="text-gray-600">Professional cleaning services in under 60 seconds</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">What's your name?</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Enter your full name"
                  className="mt-1"
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register("phone")}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
                {form.formState.errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Service Type */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Label>What type of cleaning do you need?</Label>
              <RadioGroup
                value={form.watch("serviceType")}
                onValueChange={(value) => form.setValue("serviceType", value as any)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <RadioGroupItem value="regular" id="regular" />
                  <label htmlFor="regular" className="flex items-center flex-1 cursor-pointer">
                    <Home className="text-blue-600 mr-3 w-5 h-5" />
                    <div>
                      <div className="font-medium">Regular Cleaning</div>
                      <div className="text-sm text-gray-500">Weekly, bi-weekly, or monthly</div>
                    </div>
                  </label>
                </div>
                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <RadioGroupItem value="deep" id="deep" />
                  <label htmlFor="deep" className="flex items-center flex-1 cursor-pointer">
                    <Sparkles className="text-green-600 mr-3 w-5 h-5" />
                    <div>
                      <div className="font-medium">Deep Cleaning</div>
                      <div className="text-sm text-gray-500">Thorough one-time clean</div>
                    </div>
                  </label>
                </div>
                <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <RadioGroupItem value="moveout" id="moveout" />
                  <label htmlFor="moveout" className="flex items-center flex-1 cursor-pointer">
                    <Package className="text-amber-600 mr-3 w-5 h-5" />
                    <div>
                      <div className="font-medium">Move-in/Move-out</div>
                      <div className="text-sm text-gray-500">Moving preparation cleaning</div>
                    </div>
                  </label>
                </div>
              </RadioGroup>
              {form.formState.errors.serviceType && (
                <p className="text-red-500 text-sm">{form.formState.errors.serviceType.message}</p>
              )}
            </div>
          )}

          {/* Step 3: Property Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="rooms">How many rooms?</Label>
                <Input
                  id="rooms"
                  {...form.register("rooms")}
                  placeholder="e.g., 3 bedrooms, 2 bathrooms"
                  className="mt-1"
                />
                {form.formState.errors.rooms && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.rooms.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="address">Property address</Label>
                <Input
                  id="address"
                  {...form.register("address")}
                  placeholder="Enter your address"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 4: Scheduling */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="preferredDate">When would you like service?</Label>
                <Input
                  id="preferredDate"
                  type="date"
                  {...form.register("preferredDate")}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
                {form.formState.errors.preferredDate && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.preferredDate.message}</p>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Your Quote Summary</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>Service: {form.watch("serviceType")}</div>
                  <div>Property: {form.watch("rooms")}</div>
                  <div>Date: {form.watch("preferredDate")}</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!validateStep()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createLeadMutation.isPending || !validateStep()}
                className="bg-green-600 hover:bg-green-700"
              >
                {createLeadMutation.isPending ? "Submitting..." : "Get Quote"}
              </Button>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Shield className="text-green-600 mr-2 w-4 h-4" />
                <span>Insured</span>
              </div>
              <div className="flex items-center">
                <Star className="text-amber-500 mr-2 w-4 h-4" />
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center">
                <Clock className="text-blue-600 mr-2 w-4 h-4" />
                <span>Same Day</span>
              </div>
            </div>
          </div>

          {/* Contact Alternative */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">💬 <strong>Prefer to chat?</strong></p>
              <Button variant="link" className="text-blue-600 text-sm p-0">
                Text us at (555) 123-CLEAN
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
