import { apiRequest } from "./queryClient";
import type { WidgetFormData, Lead, Appointment, SmsMessage } from "@shared/schema";

export const api = {
  // Lead operations
  createLead: (data: WidgetFormData) => 
    apiRequest("POST", "/api/leads", data),
  
  getLeads: (status?: string) => {
    const params = status ? `?status=${status}` : "";
    return fetch(`/api/leads${params}`).then(res => res.json());
  },
  
  updateLeadStatus: (id: number, status: string) =>
    apiRequest("PATCH", `/api/leads/${id}/status`, { status }),

  // Appointment operations
  getAppointments: (date?: string) => {
    const params = date ? `?date=${date}` : "";
    return fetch(`/api/appointments${params}`).then(res => res.json());
  },
  
  createAppointment: (data: Partial<Appointment>) =>
    apiRequest("POST", "/api/appointments", data),

  // Message operations
  getMessages: (phone?: string) => {
    const params = phone ? `?phone=${phone}` : "";
    return fetch(`/api/messages${params}`).then(res => res.json());
  },
  
  sendMessage: (phone: string, message: string, leadId?: number) =>
    apiRequest("POST", "/api/messages", { phone, message, leadId }),

  // Stats
  getStats: () =>
    fetch("/api/stats").then(res => res.json()),

  // Availability
  getAvailability: (startDate: string, endDate: string) =>
    fetch(`/api/availability?startDate=${startDate}&endDate=${endDate}`)
      .then(res => res.json()),
};
