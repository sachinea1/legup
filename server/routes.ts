import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, widgetFormSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { twilioService } from "./services/twilio";
import { openaiService } from "./services/openai";
import { calendarService } from "./services/calendar";
import { automationService } from "./services/automation";
import { followUpJob } from "./jobs/followUp";
import { emailService } from "./services/email";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Lead intake endpoint
  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = widgetFormSchema.parse(req.body);
      
      const lead = await storage.createLead({
        ...validatedData,
        status: "new",
        source: "widget"
      });

      // Auto-qualify new lead and schedule follow-ups
      try {
        await automationService.qualifyLead(lead.id);
        await automationService.scheduleAutomaticFollowUps(lead.id);
      } catch (error) {
        console.error("Automation error for new lead:", error);
      }

      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Get leads with optional status filter
  app.get("/api/leads", async (req, res) => {
    try {
      const { status, limit } = req.query;
      const leads = await storage.getLeads(
        status as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Update lead status
  app.patch("/api/leads/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const lead = await storage.updateLeadStatus(parseInt(id), status);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead status" });
    }
  });

  // Update lead details
  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const lead = await storage.updateLead(parseInt(id), updates);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Get availability for date range
  app.get("/api/availability", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const availability = await storage.getAvailableSlots(
        startDate as string,
        endDate as string
      );
      
      res.json(availability);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // SMS webhook from Twilio
  app.post("/api/webhooks/sms", async (req, res) => {
    try {
      const { From, Body, MessageSid } = req.body;
      
      // Store incoming SMS
      const smsMessage = await storage.createSmsMessage({
        phone: From,
        direction: "inbound",
        content: Body,
        twilioSid: MessageSid,
        status: "received",
      });

      // Find or create lead for this phone number
      const existingLeads = await storage.getLeads();
      let lead = existingLeads.find(l => l.phone === From);
      
      if (!lead) {
        // Create new lead for unknown number
        lead = await storage.createLead({
          name: "Unknown Customer",
          phone: From,
          serviceType: "regular",
          rooms: "Unknown",
          status: "new",
          source: "sms",
        });
      }

      // Link SMS to lead
      await storage.createSmsMessage({
        leadId: lead.id,
        phone: From,
        direction: "inbound",
        content: Body,
        twilioSid: MessageSid,
        status: "received",
      });

      // Process with OpenAI
      const aiResponse = await openaiService.parseSmsIntent(Body);
      
      // Mark as processed
      await storage.markSmsProcessed(smsMessage.id, aiResponse.response, aiResponse.intent);

      // Send AI response via SMS
      if (aiResponse.response) {
        await twilioService.sendSms(From, aiResponse.response);
        
        // Store outbound message
        await storage.createSmsMessage({
          leadId: lead.id,
          phone: From,
          direction: "outbound",
          content: aiResponse.response,
          status: "sent",
        });
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("SMS webhook error:", error);
      res.status(500).json({ error: "Failed to process SMS" });
    }
  });

  // Voice webhook for missed calls
  app.post("/api/webhooks/voice", async (req, res) => {
    try {
      const { From, CallStatus } = req.body;
      
      if (CallStatus === "no-answer" || CallStatus === "busy") {
        // Use automation service for missed call recovery
        await automationService.handleMissedCall(From);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Voice webhook error:", error);
      res.status(500).json({ error: "Failed to process voice call" });
    }
  });

  // Email webhook for capturing email inquiries
  app.post("/api/webhooks/email", async (req, res) => {
    try {
      const { from, subject, text, html } = req.body;
      
      await emailService.processEmailInquiry({
        from,
        subject,
        body: text || html,
        receivedAt: new Date()
      });

      res.status(200).send("OK");
    } catch (error) {
      console.error("Email webhook error:", error);
      res.status(500).json({ error: "Failed to process email" });
    }
  });

  // Test endpoint to simulate email inquiries
  app.post("/api/simulate/email", async (req, res) => {
    try {
      const { from, subject, body } = req.body;
      await emailService.simulateEmailInquiry(from, subject, body);
      res.json({ message: "Email inquiry processed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to simulate email" });
    }
  });

  // Test SMS functionality
  app.post("/api/test-sms", async (req, res) => {
    try {
      const { phone, message } = req.body;
      const messageSid = await twilioService.sendSms(phone, message);
      res.json({ success: true, messageSid });
    } catch (error) {
      console.error("SMS test failed:", error);
      res.status(500).json({ error: "Failed to send test SMS" });
    }
  });

  // Send SMS message from leads page
  app.post("/api/messages", async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      // Find the lead by phone number
      const leads = await storage.getLeads();
      const lead = leads.find(l => l.phone === phone);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found for this phone number" });
      }

      // Send SMS via Twilio
      const messageSid = await twilioService.sendSms(phone, message);
      
      // Store the outbound message in database
      const smsMessage = await storage.createSmsMessage({
        leadId: lead.id,
        phone: phone,
        direction: "outbound",
        content: message,
        twilioSid: messageSid || undefined,
        status: "sent",
      });

      res.json({ success: true, message: smsMessage });
    } catch (error) {
      console.error("Failed to send message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get appointments for a specific date
  app.get("/api/appointments", async (req, res) => {
    try {
      const { date } = req.query;
      const appointments = await storage.getAppointments(date as string);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Create new appointment
  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = {
        ...req.body,
        scheduledDate: new Date(req.body.scheduledDate)
      };
      console.log("Creating appointment with data:", appointmentData);
      const appointment = await storage.createAppointment(appointmentData);
      
      // Create Google Calendar event
      if (process.env.GOOGLE_OAUTH_CREDENTIALS) {
        try {
          const eventId = await calendarService.createEvent({
            summary: `${appointmentData.serviceType} - ${appointmentData.customerName}`,
            description: `Cleaning service appointment\nCustomer: ${appointmentData.customerName}\nPhone: ${appointmentData.customerPhone}\nService: ${appointmentData.serviceType}`,
            start: new Date(appointmentData.scheduledDate),
            duration: appointmentData.duration || 120,
            location: appointmentData.address,
          });
          
          // Update appointment with Google Event ID
          await storage.updateAppointmentStatus(appointment.id, appointment.status);
        } catch (calendarError) {
          console.error("Failed to create calendar event:", calendarError);
        }
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Appointment creation error:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // Get SMS messages for a phone number
  app.get("/api/messages", async (req, res) => {
    try {
      const { phone } = req.query;
      const messages = await storage.getSmsMessages(phone as string);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send SMS message
  app.post("/api/messages", async (req, res) => {
    try {
      const { phone, message, leadId } = req.body;
      
      await twilioService.sendSms(phone, message);
      
      const smsMessage = await storage.createSmsMessage({
        leadId: leadId || null,
        phone,
        direction: "outbound",
        content: message,
        status: "sent",
      });
      
      res.json(smsMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getLeadStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get AI suggestions for dashboard
  app.get("/api/suggestions", async (req, res) => {
    try {
      const suggestions = await automationService.getAISuggestions();
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get AI suggestions" });
    }
  });

  // Process pending follow-ups (called by cron job)
  app.post("/api/process-followups", async (req, res) => {
    try {
      const pendingFollowUps = await storage.getPendingFollowUps();
      
      for (const followUp of pendingFollowUps) {
        if (followUp.type === "sms" && followUp.leadId) {
          const lead = await storage.getLead(followUp.leadId);
          if (lead && lead.phone) {
            await twilioService.sendSms(lead.phone, followUp.message || "");
            await storage.markFollowUpCompleted(followUp.id);
          }
        }
      }
      
      res.json({ processed: pendingFollowUps.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to process follow-ups" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
