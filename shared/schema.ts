import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
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
export const leadsRelations = relations(leads, ({ many, one }) => ({
  appointments: many(appointments),
  smsMessages: many(smsMessages),
  followUps: many(followUps),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  lead: one(leads, {
    fields: [appointments.leadId],
    references: [leads.id],
  }),
}));

export const smsMessagesRelations = relations(smsMessages, ({ one }) => ({
  lead: one(leads, {
    fields: [smsMessages.leadId],
    references: [leads.id],
  }),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  lead: one(leads, {
    fields: [followUps.leadId],
    references: [leads.id],
  }),
}));

// Insert schemas
export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Types
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
