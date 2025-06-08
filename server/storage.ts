import { leads, appointments, smsMessages, availability, followUps, type Lead, type InsertLead, type Appointment, type InsertAppointment, type SmsMessage, type InsertSmsMessage, type Availability, type InsertAvailability, type FollowUp, type InsertFollowUp } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, or, asc } from "drizzle-orm";

export interface IStorage {
  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  getLeads(status?: string, limit?: number): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  updateLeadStatus(id: number, status: string): Promise<Lead | undefined>;
  updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined>;
  
  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointments(date?: string): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined>;
  
  // SMS operations
  createSmsMessage(message: InsertSmsMessage): Promise<SmsMessage>;
  getSmsMessages(phone?: string, limit?: number): Promise<SmsMessage[]>;
  getUnprocessedSms(): Promise<SmsMessage[]>;
  markSmsProcessed(id: number, aiResponse?: string, intent?: string): Promise<void>;
  
  // Availability operations
  getAvailability(date: string): Promise<Availability | undefined>;
  setAvailability(availability: InsertAvailability): Promise<Availability>;
  getAvailableSlots(startDate: string, endDate: string): Promise<Availability[]>;
  
  // Follow-up operations
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  getPendingFollowUps(): Promise<FollowUp[]>;
  markFollowUpCompleted(id: number): Promise<void>;
  
  // Analytics
  getLeadStats(): Promise<{
    totalLeads: number;
    newLeads: number;
    conversionRate: number;
    activeBookings: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Lead operations
  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values(insertLead)
      .returning();
    return lead;
  }

  async getLeads(status?: string, limit = 50): Promise<Lead[]> {
    const query = db.select().from(leads).orderBy(desc(leads.createdAt)).limit(limit);
    
    if (status) {
      return await query.where(eq(leads.status, status));
    }
    
    return await query;
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async updateLeadStatus(id: number, status: string): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  // Appointment operations
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const appointmentData = {
      ...insertAppointment,
      scheduledDate: new Date(insertAppointment.scheduledDate)
    };
    
    const [appointment] = await db
      .insert(appointments)
      .values(appointmentData)
      .returning();
    return appointment;
  }

  async getAppointments(date?: string): Promise<Appointment[]> {
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      return await db
        .select()
        .from(appointments)
        .where(
          and(
            gte(appointments.scheduledDate, startOfDay),
            lte(appointments.scheduledDate, endOfDay)
          )
        )
        .orderBy(asc(appointments.scheduledDate));
    }
    
    return await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.scheduledDate))
      .limit(20);
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined> {
    const [appointment] = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  // SMS operations
  async createSmsMessage(insertMessage: InsertSmsMessage): Promise<SmsMessage> {
    const [message] = await db
      .insert(smsMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getSmsMessages(phone?: string, limit = 50): Promise<SmsMessage[]> {
    const query = db.select().from(smsMessages).orderBy(desc(smsMessages.createdAt)).limit(limit);
    
    if (phone) {
      return await query.where(eq(smsMessages.phone, phone));
    }
    
    return await query;
  }

  async getUnprocessedSms(): Promise<SmsMessage[]> {
    return await db
      .select()
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.direction, "inbound"),
          eq(smsMessages.aiProcessed, false)
        )
      )
      .orderBy(asc(smsMessages.createdAt));
  }

  async markSmsProcessed(id: number, aiResponse?: string, intent?: string): Promise<void> {
    await db
      .update(smsMessages)
      .set({ 
        aiProcessed: true, 
        aiResponse: aiResponse || null,
        intent: intent || null
      })
      .where(eq(smsMessages.id, id));
  }

  // Availability operations
  async getAvailability(date: string): Promise<Availability | undefined> {
    const [result] = await db
      .select()
      .from(availability)
      .where(eq(availability.date, date));
    return result || undefined;
  }

  async setAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
    const [existing] = await db
      .select()
      .from(availability)
      .where(eq(availability.date, insertAvailability.date));

    if (existing) {
      const [updated] = await db
        .update(availability)
        .set({ 
          timeSlots: insertAvailability.timeSlots,
          isBlocked: insertAvailability.isBlocked,
          reason: insertAvailability.reason,
          updatedAt: new Date() 
        })
        .where(eq(availability.date, insertAvailability.date))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(availability)
      .values(insertAvailability)
      .returning();
    return created;
  }

  async getAvailableSlots(startDate: string, endDate: string): Promise<Availability[]> {
    return await db
      .select()
      .from(availability)
      .where(
        and(
          gte(availability.date, startDate),
          lte(availability.date, endDate),
          eq(availability.isBlocked, false)
        )
      )
      .orderBy(asc(availability.date));
  }

  // Follow-up operations
  async createFollowUp(insertFollowUp: InsertFollowUp): Promise<FollowUp> {
    const [followUp] = await db
      .insert(followUps)
      .values(insertFollowUp)
      .returning();
    return followUp;
  }

  async getPendingFollowUps(): Promise<FollowUp[]> {
    const now = new Date();
    return await db
      .select()
      .from(followUps)
      .where(
        and(
          eq(followUps.status, "pending"),
          lte(followUps.scheduledFor, now)
        )
      )
      .orderBy(asc(followUps.scheduledFor));
  }

  async markFollowUpCompleted(id: number): Promise<void> {
    await db
      .update(followUps)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(followUps.id, id));
  }

  // Analytics
  async getLeadStats(): Promise<{
    totalLeads: number;
    newLeads: number;
    conversionRate: number;
    activeBookings: number;
  }> {
    const allLeads = await db.select().from(leads);
    const newLeads = allLeads.filter(lead => lead.status === "new");
    const bookedLeads = allLeads.filter(lead => lead.status === "booked" || lead.status === "completed");
    
    const activeAppointments = await db
      .select()
      .from(appointments)
      .where(
        or(
          eq(appointments.status, "pending"),
          eq(appointments.status, "confirmed")
        )
      );

    return {
      totalLeads: allLeads.length,
      newLeads: newLeads.length,
      conversionRate: allLeads.length > 0 ? Math.round((bookedLeads.length / allLeads.length) * 100) : 0,
      activeBookings: activeAppointments.length,
    };
  }
}

export const storage = new DatabaseStorage();
