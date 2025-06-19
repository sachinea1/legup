import { users, organizations, invitations, leads, appointments, smsMessages, availability, followUps, type User, type InsertUser, type Organization, type InsertOrganization, type OrganizationSetup, type Invitation, type InsertInvitation, type Lead, type InsertLead, type Appointment, type InsertAppointment, type SmsMessage, type InsertSmsMessage, type Availability, type InsertAvailability, type FollowUp, type InsertFollowUp } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, or, asc } from "drizzle-orm";

export interface IStorage {
  // Organization operations
  createOrganization(org: OrganizationSetup): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  updateOrganization(id: number, updates: Partial<OrganizationSetup>): Promise<Organization | undefined>;
  
  // User operations
  createUser(user: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserResetToken(id: number, token: string | null, expiry: Date | null): Promise<void>;
  updateUserPassword(id: number, passwordHash: string): Promise<void>;
  updateUserOrganization(id: number, organizationId: number, role: string): Promise<void>;
  markUserOnboarded(id: number): Promise<void>;
  getOrganizationUsers(organizationId: number): Promise<User[]>;
  
  // Invitation operations
  createInvitation(invitation: InsertInvitation & { token: string; expiresAt: Date }): Promise<Invitation>;
  getInvitation(token: string): Promise<Invitation | undefined>;
  acceptInvitation(token: string): Promise<Invitation | undefined>;
  getOrganizationInvitations(organizationId: number): Promise<Invitation[]>;
  
  // Lead operations
  createLead(lead: InsertLead, ownerId: number, organizationId?: number): Promise<Lead>;
  getLeads(ownerId: number, status?: string, limit?: number): Promise<Lead[]>;
  getLead(id: number, ownerId: number): Promise<Lead | undefined>;
  updateLeadStatus(id: number, ownerId: number, status: string): Promise<Lead | undefined>;
  updateLead(id: number, ownerId: number, updates: Partial<InsertLead>): Promise<Lead | undefined>;
  
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
  getLeadStats(ownerId: number): Promise<{
    totalLeads: number;
    newLeads: number;
    conversionRate: number;
    activeBookings: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Organization operations
  async createOrganization(orgData: OrganizationSetup): Promise<Organization> {
    const [organization] = await db
      .insert(organizations)
      .values({
        name: orgData.name,
        slug: orgData.slug,
        settings: {
          businessHours: orgData.businessHours,
          timezone: orgData.timezone,
          defaultServices: orgData.defaultServices,
          address: orgData.address,
          phone: orgData.phone,
        }
      })
      .returning();
    return organization;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org || undefined;
  }

  async updateOrganization(id: number, updates: Partial<OrganizationSetup>): Promise<Organization | undefined> {
    const [updated] = await db
      .update(organizations)
      .set({
        name: updates.name,
        settings: updates.address || updates.phone || updates.businessHours || updates.timezone || updates.defaultServices ? {
          businessHours: updates.businessHours,
          timezone: updates.timezone,
          defaultServices: updates.defaultServices,
          address: updates.address,
          phone: updates.phone,
        } : undefined
      })
      .where(eq(organizations.id, id))
      .returning();
    return updated || undefined;
  }

  // User operations
  async createUser(user: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUserResetToken(id: number, token: string | null, expiry: Date | null): Promise<void> {
    await db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.id, id));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user || undefined;
  }

  async updateUserPassword(id: number, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, id));
  }

  async updateUserOrganization(id: number, organizationId: number, role: string): Promise<void> {
    await db
      .update(users)
      .set({ organizationId, role })
      .where(eq(users.id, id));
  }

  async markUserOnboarded(id: number): Promise<void> {
    await db
      .update(users)
      .set({ isOnboarded: true })
      .where(eq(users.id, id));
  }

  async getOrganizationUsers(organizationId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }

  // Invitation operations
  async createInvitation(invitation: InsertInvitation & { token: string; expiresAt: Date }): Promise<Invitation> {
    const [newInvitation] = await db
      .insert(invitations)
      .values(invitation)
      .returning();
    return newInvitation;
  }

  async getInvitation(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));
    return invitation || undefined;
  }

  async acceptInvitation(token: string): Promise<Invitation | undefined> {
    const [accepted] = await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.token, token))
      .returning();
    return accepted || undefined;
  }

  async getOrganizationInvitations(organizationId: number): Promise<Invitation[]> {
    return await db
      .select()
      .from(invitations)
      .where(eq(invitations.organizationId, organizationId));
  }

  // Lead operations
  async createLead(insertLead: InsertLead, ownerId: number, organizationId?: number): Promise<Lead> {
    // Get user's organization if not provided
    if (!organizationId) {
      const user = await this.getUser(ownerId);
      if (!user?.organizationId) {
        throw new Error("User must be assigned to an organization");
      }
      organizationId = user.organizationId;
    }
    
    const [lead] = await db
      .insert(leads)
      .values({ ...insertLead, ownerId, organizationId })
      .returning();
    return lead;
  }

  async getLeads(ownerId: number, status?: string, limit = 50): Promise<Lead[]> {
    let query = db.select().from(leads)
      .where(eq(leads.ownerId, ownerId))
      .orderBy(desc(leads.createdAt))
      .limit(limit);
    
    if (status) {
      query = db.select().from(leads)
        .where(and(eq(leads.ownerId, ownerId), eq(leads.status, status)))
        .orderBy(desc(leads.createdAt))
        .limit(limit);
    }

    return await query;
  }

  async getLead(id: number, ownerId: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads)
      .where(and(eq(leads.id, id), eq(leads.ownerId, ownerId)));
    return lead || undefined;
  }

  async updateLeadStatus(id: number, ownerId: number, status: string): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.ownerId, ownerId)))
      .returning();
    return lead || undefined;
  }

  async updateLead(id: number, ownerId: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.ownerId, ownerId)))
      .returning();
    return lead || undefined;
  }

  // Appointment operations
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db
      .insert(appointments)
      .values(insertAppointment)
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
          timeSlots: insertAvailability.timeSlots as string[],
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
      .values({
        date: insertAvailability.date,
        timeSlots: insertAvailability.timeSlots,
        isBlocked: insertAvailability.isBlocked,
        reason: insertAvailability.reason
      })
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
  async getLeadStats(ownerId: number): Promise<{
    totalLeads: number;
    newLeads: number;
    conversionRate: number;
    activeBookings: number;
  }> {
    const allLeads = await db.select().from(leads).where(eq(leads.ownerId, ownerId));
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
