import { storage } from "../storage";
import { openaiService } from "./openai";
import { twilioService } from "./twilio";

interface LeadQualificationResult {
  score: number; // 0-100
  priority: "low" | "normal" | "high" | "urgent";
  reasons: string[];
  suggestedActions: string[];
}

class AutomationService {
  // Automatically qualify new leads using AI
  async qualifyLead(leadId: number): Promise<LeadQualificationResult> {
    const lead = await storage.getLead(leadId);
    if (!lead) throw new Error("Lead not found");

    let score = 50; // Base score
    const reasons: string[] = [];
    const suggestedActions: string[] = [];

    // Service type scoring
    if (lead.serviceType === "deep" || lead.serviceType === "moveout") {
      score += 20;
      reasons.push("High-value service type");
    }

    // Contact information completeness
    if (lead.phone && lead.address) {
      score += 15;
      reasons.push("Complete contact information");
    }

    // Preferred date proximity
    if (lead.preferredDate) {
      const preferredDate = new Date(lead.preferredDate);
      const daysFromNow = (preferredDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysFromNow <= 7) {
        score += 15;
        reasons.push("Urgent timeline");
        suggestedActions.push("Contact within 2 hours");
      }
    }

    // Determine priority
    let priority: "low" | "normal" | "high" | "urgent" = "normal";
    if (score >= 80) priority = "urgent";
    else if (score >= 65) priority = "high";
    else if (score <= 35) priority = "low";

    // Update lead with qualification
    await storage.updateLead(leadId, { 
      priority,
      notes: `AI Qualification Score: ${score}/100. ${reasons.join(", ")}`
    });

    return { score, priority, reasons, suggestedActions };
  }

  // Auto-schedule follow-ups based on lead status and behavior
  async scheduleAutomaticFollowUps(leadId: number): Promise<void> {
    const lead = await storage.getLead(leadId);
    if (!lead) return;

    // Schedule initial response (immediate)
    await storage.createFollowUp({
      leadId,
      type: "sms",
      scheduledFor: new Date(),
      message: await openaiService.generateIntakeResponse(lead),
      status: "pending"
    });

    // Schedule follow-up reminder (24 hours if no response)
    const followUpDate = new Date();
    followUpDate.setHours(followUpDate.getHours() + 24);
    
    await storage.createFollowUp({
      leadId,
      type: "sms", 
      scheduledFor: followUpDate,
      message: await openaiService.generateFollowUpMessage(lead),
      status: "pending"
    });
  }

  // Process missed calls and auto-recover
  async handleMissedCall(phone: string): Promise<void> {
    // Find or create lead for missed call
    const existingLeads = await storage.getLeads();
    let lead = existingLeads.find(l => l.phone === phone);
    
    if (!lead) {
      lead = await storage.createLead({
        name: "Missed Call Prospect",
        phone: phone,
        serviceType: "regular",
        rooms: "Unknown",
        status: "new",
        source: "call",
        priority: "high" // Missed calls get high priority
      });
    }

    // Auto-qualify the lead
    await this.qualifyLead(lead.id);

    // Send immediate recovery message
    const recoveryMessage = await openaiService.generateMissedCallResponse(phone);
    await twilioService.sendSms(phone, recoveryMessage);
    
    // Store the recovery message
    await storage.createSmsMessage({
      leadId: lead.id,
      phone: phone,
      direction: "outbound",
      content: recoveryMessage,
      status: "sent",
    });

    // Schedule follow-up sequence
    await this.scheduleAutomaticFollowUps(lead.id);
  }

  // Process incoming SMS and provide intelligent responses
  async processIncomingSms(phone: string, message: string): Promise<void> {
    // Find associated lead
    const leads = await storage.getLeads();
    const lead = leads.find(l => l.phone === phone);
    
    if (!lead) return;

    // Store incoming message
    await storage.createSmsMessage({
      leadId: lead.id,
      phone,
      direction: "inbound", 
      content: message,
      status: "received",
    });

    // Get AI analysis and response
    const aiResponse = await openaiService.parseSmsIntent(message, phone);
    
    // Update lead status based on intent
    if (aiResponse.intent.includes("book") || aiResponse.intent.includes("schedule")) {
      await storage.updateLeadStatus(lead.id, "interested");
    } else if (aiResponse.intent.includes("cancel") || aiResponse.intent.includes("not interested")) {
      await storage.updateLeadStatus(lead.id, "not_interested");
    }

    // Send automated response if appropriate
    if (!aiResponse.requiresHuman && aiResponse.response) {
      await twilioService.sendSms(phone, aiResponse.response);
      
      // Store outbound response
      await storage.createSmsMessage({
        leadId: lead.id,
        phone,
        direction: "outbound",
        content: aiResponse.response,
        status: "sent",
        aiResponse: aiResponse.response,
        intent: aiResponse.intent
      });
    }

    // Mark original message as processed
    const inboundMessages = await storage.getSmsMessages(phone);
    const latestInbound = inboundMessages
      .filter(m => m.direction === "inbound" && !m.aiProcessed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    if (latestInbound) {
      await storage.markSmsProcessed(latestInbound.id, aiResponse.response, aiResponse.intent);
    }
  }

  // Get AI suggestions for dashboard
  async getAISuggestions(): Promise<Array<{
    type: "urgent" | "opportunity" | "follow_up";
    leadId: number;
    message: string;
    action: string;
  }>> {
    const suggestions = [];
    const leads = await storage.getLeads();

    for (const lead of leads.slice(0, 10)) { // Limit to top 10 for performance
      // Check for urgent leads
      if (lead.priority === "urgent" && lead.status === "new") {
        suggestions.push({
          type: "urgent" as const,
          leadId: lead.id,
          message: `${lead.name} has urgent ${lead.serviceType} cleaning request`,
          action: "Contact immediately"
        });
      }

      // Check for stale leads needing follow-up
      const leadAge = Date.now() - new Date(lead.createdAt).getTime();
      const hoursOld = leadAge / (1000 * 60 * 60);
      
      if (hoursOld > 48 && lead.status === "new") {
        suggestions.push({
          type: "follow_up" as const,
          leadId: lead.id,
          message: `${lead.name} hasn't been contacted in ${Math.floor(hoursOld)} hours`,
          action: "Send follow-up message"
        });
      }

      // Check for booking opportunities
      const messages = await storage.getSmsMessages(lead.phone);
      const recentMessages = messages.filter(m => {
        const messageAge = Date.now() - new Date(m.createdAt).getTime();
        return messageAge < (24 * 60 * 60 * 1000); // Last 24 hours
      });

      if (recentMessages.some(m => m.content.toLowerCase().includes("book") || m.content.toLowerCase().includes("schedule"))) {
        suggestions.push({
          type: "opportunity" as const,
          leadId: lead.id,
          message: `${lead.name} expressed interest in booking`,
          action: "Send booking link"
        });
      }
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }
}

export const automationService = new AutomationService();