import { google } from "googleapis";

interface CalendarEvent {
  summary: string;
  description?: string;
  start: Date;
  duration: number; // minutes
  location?: string;
}

class CalendarService {
  private calendar: any;
  private isInitialized = false;

  async initialize() {
    try {
      const credentials = process.env.GOOGLE_OAUTH_CREDENTIALS;
      if (!credentials) {
        console.warn("Google Calendar credentials not found. Calendar features will be disabled.");
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(credentials),
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.isInitialized = true;
      console.log("Google Calendar service initialized");
    } catch (error) {
      console.error("Failed to initialize Google Calendar:", error);
    }
  }

  async createEvent(event: CalendarEvent): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.calendar) {
        throw new Error("Calendar service not available");
      }

      const endTime = new Date(event.start.getTime() + event.duration * 60000);

      const calendarEvent = {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'America/New_York', // Configure this based on your timezone
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'sms', minutes: 60 }, // 1 hour before
            { method: 'sms', minutes: 1440 }, // 24 hours before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: calendarEvent,
      });

      console.log(`Calendar event created: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error("Failed to create calendar event:", error);
      throw error;
    }
  }

  async getEvents(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.calendar) {
        return [];
      }

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      return [];
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      if (!this.calendar) {
        return false;
      }

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });

      console.log(`Calendar event deleted: ${eventId}`);
      return true;
    } catch (error) {
      console.error("Failed to delete calendar event:", error);
      return false;
    }
  }

  async getBusySlots(startDate: Date, endDate: Date): Promise<{ start: Date; end: Date }[]> {
    try {
      const events = await this.getEvents(startDate, endDate);
      
      return events.map(event => ({
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
      }));
    } catch (error) {
      console.error("Failed to get busy slots:", error);
      return [];
    }
  }
}

export const calendarService = new CalendarService();
