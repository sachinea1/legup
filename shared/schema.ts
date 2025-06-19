import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // unique identifier like "cleanflow-chicago"
  logo: text("logo"), // logo URL
  settings: jsonb("settings").$type<{
    businessHours?: string[];
    timezone?: string;
    defaultServices?: string[];
    address?: string;
    phone?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  email: text("email").notNull(),
  role: text("role").default("staff"), // owner, manager, staff
  token: text("token").notNull().unique(),
  invitedById: integer("invited_by_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").default("staff"), // owner, manager, staff
  isOnboarded: boolean("is_onboarded").default(false),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: text("email"),
  serviceType: text("service_type").notNull(),
  rooms: text("rooms"),
  preferredDate: text("preferred_date"),
  address: text("address"),
  status: text("status").notNull().default("new"), // new, contacted, booked, completed, cancelled
  priority: text("priority").default("normal"), // low, normal, high
  notes: text("notes"),
  estimatedCost: integer("estimated_cost"),
  source: text("source").default("widget"), // widget, sms, call, referral
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  leadId: integer("lead_id").references(() => leads.id),
  customerName: text("customer_name").notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  serviceType: text("service_type").notNull(),
  address: text("address").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(120), // minutes
  status: text("status").notNull().default("pending"), // pending, confirmed, in_progress, completed, cancelled
  googleEventId: text("google_event_id"),
  cost: integer("cost"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  leadId: integer("lead_id").references(() => leads.id),
  phone: varchar("phone", { length: 20 }).notNull(),
  direction: text("direction").notNull(), // inbound, outbound
  content: text("content").notNull(),
  twilioSid: text("twilio_sid"),
  status: text("status").default("sent"), // sent, delivered, failed, received
  aiProcessed: boolean("ai_processed").default(false),
  aiResponse: text("ai_response"),
  intent: text("intent"), // booking_inquiry, availability_check, confirmation, complaint, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  timeSlots: jsonb("time_slots").$type<string[]>().notNull(), // Array of time slots like ["09:00", "10:00", "14:00"]
  isBlocked: boolean("is_blocked").default(false),
  reason: text("reason"), // holiday, maintenance, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  leadId: integer("lead_id").references(() => leads.id),
  type: text("type").notNull(), // sms, email, call
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").default("pending"), // pending, sent, completed, failed
  message: text("message"),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  leads: many(leads),
  appointments: many(appointments),
  smsMessages: many(smsMessages),
  followUps: many(followUps),
  invitations: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedById],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [leads.organizationId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [leads.ownerId],
    references: [users.id],
  }),
  appointments: many(appointments),
  smsMessages: many(smsMessages),
  followUps: many(followUps),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointments.organizationId],
    references: [organizations.id],
  }),
  lead: one(leads, {
    fields: [appointments.leadId],
    references: [leads.id],
  }),
}));

export const smsMessagesRelations = relations(smsMessages, ({ one }) => ({
  organization: one(organizations, {
    fields: [smsMessages.organizationId],
    references: [organizations.id],
  }),
  lead: one(leads, {
    fields: [smsMessages.leadId],
    references: [leads.id],
  }),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  organization: one(organizations, {
    fields: [followUps.organizationId],
    references: [organizations.id],
  }),
  lead: one(leads, {
    fields: [followUps.leadId],
    references: [leads.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  token: true,
  createdAt: true,
  acceptedAt: true,
  expiresAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  resetToken: true,
  resetTokenExpiry: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email address"),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  organizationId: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rooms: z.string().optional(),
  preferredDate: z.string().optional(),
  email: z.string().optional(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFollowUpSchema = createInsertSchema(followUps).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Widget form schema with validation
export const widgetFormSchema = insertLeadSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  serviceType: z.enum(["regular", "deep", "moveout", "commercial"], {
    required_error: "Please select a service type",
  }),
  rooms: z.string().min(1, "Please specify number of rooms"),
  preferredDate: z.string().min(1, "Please select a preferred date"),
});

// Manual lead creation schema (less strict validation)
export const manualLeadSchema = insertLeadSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  serviceType: z.enum(["regular", "deep", "moveout", "commercial"], {
    required_error: "Please select a service type",
  }),
  rooms: z.string().optional(),
  preferredDate: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Organization onboarding schemas
export const organizationSetupSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  slug: z.string().min(3, "Company identifier must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  businessHours: z.array(z.string()).default(["09:00-17:00"]),
  defaultServices: z.array(z.string()).default(["regular", "deep", "moveout"]),
});

export const inviteTeamMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["staff", "manager"], {
    required_error: "Please select a role",
  }),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationSetup = z.infer<typeof organizationSetupSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type InviteTeamMember = z.infer<typeof inviteTeamMemberSchema>;
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type WidgetFormData = z.infer<typeof widgetFormSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
