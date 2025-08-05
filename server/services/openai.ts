import OpenAI from "openai";
import type { Lead } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface SmsParseResult {
  intent: string;
  confidence: number;
  response: string;
  requiresHuman: boolean;
  suggestedActions: string[];
}

class OpenAIService {
  async parseSmsIntent(message: string, phone?: string): Promise<SmsParseResult> {
    try {
      const prompt = `You are an AI assistant for a professional cleaning service. Parse the incoming SMS message and determine the customer's intent and generate an appropriate response.

Incoming message: "${message}"
Customer phone: "${phone || 'unknown'}"

Tasks:
1. Identify the customer's intent (booking_inquiry, availability_check, confirmation, complaint, question, etc.)
2. Generate a helpful, professional response
3. If it's a booking inquiry, ask for necessary details (service type, location, preferred date)
4. If asking about availability, provide general availability info
5. Keep responses under 160 characters when possible

Response should be in JSON format:
{
  "intent": "booking_inquiry|availability_check|confirmation|complaint|question|other",
  "confidence": 0.0-1.0,
  "response": "Your SMS response text here",
  "requiresHuman": false,
  "suggestedActions": ["action1", "action2"]
}

Be helpful, professional, and concise. If the message is unclear or seems urgent, set "requiresHuman": true.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for a professional cleaning service company. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        intent: result.intent || "other",
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        response: result.response || "Thank you for your message. We'll get back to you soon!",
        requiresHuman: result.requiresHuman || false,
        suggestedActions: result.suggestedActions || [],
      };
    } catch (error: any) {
      console.error("Failed to parse SMS intent:", error);
      
      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota') {
        console.warn("OpenAI quota exceeded - using fallback response");
        return {
          intent: "booking_inquiry",
          confidence: 0.5,
          response: "Thank you for your message! We'll get back to you within 24 hours to discuss your cleaning needs.",
          requiresHuman: true,
          suggestedActions: ["manual_review"],
        };
      }
      
      // Fallback response for other errors
      return {
        intent: "other",
        confidence: 0.1,
        response: "Thank you for contacting us! We'll respond to your message shortly.",
        requiresHuman: true,
        suggestedActions: ["manual_review"],
      };
    }
  }

  async generateFollowUpMessage(lead: Lead, organizationId?: number | null): Promise<string> {
    try {
      const timeAgo = Math.floor((Date.now() - new Date(lead.createdAt || new Date()).getTime()) / (1000 * 60 * 60));
      const attemptNumber = 1; // This could be tracked in the database

      const prompt = `You are creating a follow-up message for a cleaning service lead who has not responded to initial contact.

Context:
- Lead submitted inquiry ${timeAgo} hours ago
- Service requested: ${lead.serviceType}
- No response to initial contact
- This is follow-up attempt #${attemptNumber}

Guidelines:
1. Be helpful, not pushy
2. Offer value (tips, availability, etc.)
3. Make it easy to respond
4. Keep under 160 characters
5. Include a soft call-to-action

Lead Details:
- Name: ${lead.name}
- Service: ${lead.serviceType}
- Rooms: ${lead.rooms}
- Status: ${lead.status}

Create a personalized, non-intrusive follow-up message that encourages engagement. Respond with just the message text, no additional formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for a professional cleaning service company. Create concise, friendly follow-up messages."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 100,
      });

      return response.choices[0].message.content || 
        `Hi ${lead.name}! Still interested in ${lead.serviceType} service? We have availability this week. Reply if you'd like to schedule!`;
    } catch (error) {
      console.error("Failed to generate follow-up message:", error);
      return `Hi ${lead.name}! Just checking if you're still interested in our ${lead.serviceType} service. We'd love to help! Reply to schedule.`;
    }
  }

  async generateIntakeResponse(lead: Lead): Promise<string> {
    try {
      const prompt = `You are a helpful assistant for a professional cleaning service company. A potential customer has just submitted an inquiry through our booking widget.

Your task is to:
1. Acknowledge their request professionally
2. Confirm the details they provided
3. Offer next steps (scheduling, additional questions, etc.)
4. Maintain a friendly, professional tone
5. Include a call-to-action

Customer Details:
- Name: ${lead.name}
- Phone: ${lead.phone}
- Service Type: ${lead.serviceType}
- Number of Rooms: ${lead.rooms}
- Preferred Date: ${lead.preferredDate || 'Not specified'}
- Address: ${lead.address || 'Not provided'}

Keep the response under 160 characters to fit in a single SMS.
Be warm, professional, and action-oriented.

Respond with just the message text, no additional formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for a professional cleaning service company. Create warm, professional responses."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 80,
      });

      return response.choices[0].message.content || 
        `Hi ${lead.name}! Thanks for requesting ${lead.serviceType} service. We'll call you within 2 hours to confirm your booking!`;
    } catch (error) {
      console.error("Failed to generate intake response:", error);
      return `Hi ${lead.name}! Thank you for your ${lead.serviceType} service request. We'll contact you soon to schedule your appointment!`;
    }
  }

  async generateMissedCallResponse(phone: string): Promise<string> {
    try {
      const prompt = `Generate a text message for someone who just called our cleaning service but we missed their call.

Goals:
1. Apologize for missing their call
2. Offer alternative ways to connect
3. Mention our services briefly
4. Encourage immediate response
5. Keep it professional and friendly

Context:
- This is a cleaning service business
- Customer called during business hours
- We want to capture this lead quickly
- SMS should be under 160 characters

Include:
- Apology for missed call
- Easy way to respond or book
- Mention of our cleaning services
- Professional yet approachable tone

Respond with just the message text, no additional formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for a professional cleaning service company. Create apologetic but professional responses."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 80,
      });

      return response.choices[0].message.content || 
        "Sorry we missed your call! Text us back or visit our booking page to schedule your cleaning service. We're here to help!";
    } catch (error) {
      console.error("Failed to generate missed call response:", error);
      return "Hi! We missed your call. Text us back or visit our booking page to schedule your cleaning service.";
    }
  }
}

export const openaiService = new OpenAIService();
