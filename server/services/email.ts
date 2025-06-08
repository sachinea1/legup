import { storage } from "../storage";
import { openaiService } from "./openai";

interface EmailInquiry {
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

interface ParsedEmailLead {
  name?: string;
  email: string;
  phone?: string;
  serviceType: "regular" | "deep" | "moveout" | "commercial";
  message: string;
  urgency: "low" | "normal" | "high";
}

class EmailService {
  // Parse email inquiry using AI to extract lead information
  async parseEmailInquiry(emailData: EmailInquiry): Promise<ParsedEmailLead> {
    try {
      // Extract basic information from email
      const email = emailData.from;
      let name = email.split('@')[0].replace(/[._]/g, ' ');
      
      // Use subject and body to determine service type and urgency
      const content = `${emailData.subject} ${emailData.body}`.toLowerCase();
      
      let serviceType: "regular" | "deep" | "moveout" | "commercial" = "regular";
      if (content.includes("deep") || content.includes("spring")) serviceType = "deep";
      else if (content.includes("move") || content.includes("moving")) serviceType = "moveout";
      else if (content.includes("office") || content.includes("commercial") || content.includes("business")) serviceType = "commercial";
      
      let urgency: "low" | "normal" | "high" = "normal";
      if (content.includes("urgent") || content.includes("asap") || content.includes("emergency")) urgency = "high";
      else if (content.includes("whenever") || content.includes("no rush")) urgency = "low";
      
      // Extract phone number if present
      const phoneMatch = emailData.body.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
      const phone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : undefined;
      
      return {
        name,
        email,
        phone,
        serviceType,
        message: `${emailData.subject}\n\n${emailData.body}`,
        urgency
      };
    } catch (error) {
      console.error("Email parsing error:", error);
      return {
        email: emailData.from,
        serviceType: "regular",
        message: `${emailData.subject}\n\n${emailData.body}`,
        urgency: "normal"
      };
    }
  }

  // Process incoming email and create lead
  async processEmailInquiry(emailData: EmailInquiry): Promise<void> {
    try {
      const parsedLead = await this.parseEmailInquiry(emailData);
      
      // Check if lead already exists by email
      const existingLeads = await storage.getLeads();
      const existingLead = existingLeads.find(l => l.email === parsedLead.email);
      
      if (existingLead) {
        // Update existing lead with new message
        await storage.updateLead(existingLead.id, {
          notes: `${existingLead.notes || ''}\n\nNew email inquiry: ${parsedLead.message}`.trim()
        });
        
        // Create SMS message record for email inquiry
        await storage.createSmsMessage({
          leadId: existingLead.id,
          phone: (parsedLead.phone || "email").substring(0, 20),
          direction: "inbound",
          content: `Email: ${emailData.subject}\n${emailData.body}`.substring(0, 500),
          status: "received",
        });
      } else {
        // Create new lead from email
        const newLead = await storage.createLead({
          name: parsedLead.name || "Email Inquiry",
          phone: (parsedLead.phone || "email").substring(0, 20),
          email: parsedLead.email,
          serviceType: parsedLead.serviceType,
          rooms: "To be determined",
          status: "new",
          source: "email",
          priority: parsedLead.urgency === "high" ? "urgent" : parsedLead.urgency === "low" ? "low" : "normal",
          notes: parsedLead.message.substring(0, 500)
        });
        
        // Create message record
        await storage.createSmsMessage({
          leadId: newLead.id,
          phone: (parsedLead.phone || "email").substring(0, 20),
          direction: "inbound",
          content: `Email: ${emailData.subject}\n${emailData.body}`.substring(0, 500),
          status: "received",
        });
      }
    } catch (error) {
      console.error("Failed to process email inquiry:", error);
    }
  }

  // Simulate email webhook for testing
  async simulateEmailInquiry(from: string, subject: string, body: string): Promise<void> {
    const emailData: EmailInquiry = {
      from,
      subject,
      body,
      receivedAt: new Date()
    };
    
    await this.processEmailInquiry(emailData);
  }
}

export const emailService = new EmailService();