import twilio from 'twilio';

class TwilioService {
  private client: any;
  private initialized = false;

  private initialize() {
    if (this.initialized) return;
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.warn("Twilio credentials not found. SMS features will be disabled.");
      this.client = null;
      this.initialized = true;
      return;
    }

    console.log("Initializing Twilio with live credentials...");
    this.client = twilio(accountSid, authToken);
    this.initialized = true;
  }

  async sendSms(to: string, body: string): Promise<string | null> {
    this.initialize();
    
    try {
      if (!this.client) {
        console.log(`Mock SMS to ${to}: ${body}`);
        return `mock_${Date.now()}`;
      }

      const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;
      if (!fromNumber) {
        throw new Error("Twilio phone number not configured");
      }

      const message = await this.client.messages.create({
        body,
        from: fromNumber,
        to,
      });

      console.log(`SMS sent successfully: ${message.sid}`);
      return message.sid;
    } catch (error) {
      console.error("Failed to send SMS:", error);
      throw error;
    }
  }

  async getMessageStatus(messageSid: string): Promise<string | null> {
    this.initialize();
    
    try {
      if (!this.client) {
        throw new Error("Twilio client not initialized");
      }

      const message = await this.client.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      console.error("Failed to get message status:", error);
      return null;
    }
  }

  formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, "");
    
    // Add +1 if it's a 10-digit US number
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // Add + if it doesn't start with it
    if (!cleaned.startsWith("+")) {
      return `+${cleaned}`;
    }
    
    return cleaned;
  }
}

export const twilioService = new TwilioService();
