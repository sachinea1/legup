import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { insertLeadSchema, widgetFormSchema, manualLeadSchema, insertUserSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema, organizationSetupSchema, inviteTeamMemberSchema, acceptInvitationSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import crypto from "crypto";
import { twilioService } from "./services/twilio";
import { openaiService } from "./services/openai";
import { calendarService } from "./services/calendar";
import { automationService } from "./services/automation";
import { followUpJob } from "./jobs/followUp";
import { emailService } from "./services/email";
import { AuthService, authenticateToken } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Rate limiting for auth endpoints
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: "Too many authentication attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Auth endpoints
  app.post("/api/auth/signup", authRateLimit, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(validatedData.password);
      
      // Create user
      const user = await storage.createUser({
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
      });

      // Generate JWT and set httpOnly cookie
      const token = AuthService.generateJWT(user.id);

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000 // 1 hour
      });

      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name },
        token, // Still return token for frontend compatibility
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await AuthService.comparePassword(validatedData.password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate JWT and set httpOnly cookie
      const token = AuthService.generateJWT(user.id);

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000 // 1 hour
      });

      res.json({
        user: { id: user.id, email: user.email, name: user.name },
        token, // Still return token for frontend compatibility
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/password-reset-request", authRateLimit, async (req, res) => {
    try {
      const validatedData = passwordResetRequestSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        // Don't reveal if email exists or not
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate reset token
      const resetToken = AuthService.generateResetToken();
      const hashedToken = AuthService.hashResetToken(resetToken);
      const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store hashed token in database
      await storage.updateUserResetToken(user.id, hashedToken, expiryDate);

      // Send email with plain token
      await emailService.sendPasswordResetEmail(user.email, resetToken);

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/password-reset", authRateLimit, async (req, res) => {
    try {
      const validatedData = passwordResetSchema.parse(req.body);
      
      // Hash the provided token to compare with stored hash
      const hashedToken = AuthService.hashResetToken(validatedData.token);
      
      // Find user with matching reset token and check expiry
      const users = await storage.getUserByResetToken(hashedToken);
      if (!users || !users.resetTokenExpiry || users.resetTokenExpiry < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const passwordHash = await AuthService.hashPassword(validatedData.password);
      
      // Update password and clear reset token
      await storage.updateUserPassword(users.id, passwordHash);

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/auth/profile", authenticateToken, async (req, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Check if email is already taken by another user
      const currentUser = await storage.getUser(req.user!.id);
      if (validatedData.email !== currentUser?.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== req.user!.id) {
          return res.status(400).json({ error: "Email already taken" });
        }
      }
      
      // Update user
      const updatedUser = await storage.updateUser(req.user!.id, {
        name: validatedData.name,
        email: validatedData.email,
      });
      
      res.json({ user: updatedUser });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Change password
  app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    try {
      const changePasswordSchema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      });
      
      const validatedData = changePasswordSchema.parse(req.body);
      
      // Get current user
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Verify current password
      const isValidPassword = await AuthService.comparePassword(validatedData.currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      // Hash new password
      const newPasswordHash = await AuthService.hashPassword(validatedData.newPassword);
      
      // Update password
      await storage.updateUserPassword(user.id, newPasswordHash);
      
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Protect admin routes with authentication
  app.use("/api/appointments", authenticateToken);
  app.use("/api/sms", authenticateToken);
  app.use("/api/stats", authenticateToken);
  app.use("/api/suggestions", authenticateToken);
  app.use("/api/messages", authenticateToken);

  // Widget lead intake endpoint (public, assigns to default owner)
  app.post("/api/widget/leads", async (req, res) => {
    try {
      const schema = widgetFormSchema;
      const validatedData = schema.parse(req.body);
      
      // Format phone number to E.164 format
      const formattedPhone = twilioService.formatPhoneNumber(validatedData.phone);
      
      // Assign to default admin user for widget leads
      const defaultUser = await storage.getUserByEmail("test@cleanflow.com");
      if (!defaultUser) {
        return res.status(500).json({ error: "Default user not configured" });
      }

      const lead = await storage.createLead({
        ...validatedData,
        phone: formattedPhone,
        status: "new",
        source: "widget"
      }, defaultUser.id);

      // Auto-qualify new lead and schedule follow-ups
      try {
        await automationService.qualifyLead(lead.id);
        await automationService.scheduleAutomaticFollowUps(lead.id);
      } catch (automationError) {
        console.error("Automation failed for lead:", lead.id, automationError);
      }

      res.status(201).json(lead);
    } catch (error: any) {
      console.error("Lead creation error:", error);
      if (error.name === 'ZodError') {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Lead intake endpoint (protected)
  app.post("/api/leads", authenticateToken, async (req, res) => {
    try {
      // Use different validation based on source
      const isFromWidget = req.body.source === "widget";
      const schema = isFromWidget ? widgetFormSchema : manualLeadSchema;
      const validatedData = schema.parse(req.body);
      
      // Format phone number to E.164 format
      const formattedPhone = twilioService.formatPhoneNumber(validatedData.phone);
      
      const lead = await storage.createLead({
        ...validatedData,
        phone: formattedPhone,
        status: validatedData.status || "new",
        source: validatedData.source || (isFromWidget ? "widget" : "manual")
      }, req.user!.id);

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
  app.get("/api/leads", authenticateToken, async (req, res) => {
    try {
      const { status, limit } = req.query;
      // Filter leads by user ownership - data isolation
      const leads = await storage.getLeads(
        req.user!.id,
        status as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Update lead status
  app.patch("/api/leads/:id/status", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const lead = await storage.updateLeadStatus(parseInt(id), req.user!.id, status);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead status" });
    }
  });

  // Update lead details
  app.patch("/api/leads/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const lead = await storage.updateLead(parseInt(id), req.user!.id, updates);
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

      // For SMS webhook, assign to first available admin user (temporary solution)
      // In production, you'd implement proper SMS routing logic
      const adminUser = await storage.getUserByEmail("test@cleanflow.com");
      if (!adminUser) {
        return res.status(500).json({ error: "No admin user found" });
      }

      // Find or create lead for this phone number
      const existingLeads = await storage.getLeads(adminUser.id);
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
        }, adminUser.id);
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

  // Email webhook for capturing email inquiries (placeholder for future implementation)
  app.post("/api/webhooks/email", async (req, res) => {
    try {
      // TODO: Implement email inquiry processing
      res.status(200).send("Email webhook received");
    } catch (error) {
      console.error("Email webhook error:", error);
      res.status(500).json({ error: "Failed to process email" });
    }
  });

  // Organization setup
  app.post("/api/organizations", authenticateToken, async (req, res) => {
    try {
      const result = organizationSetupSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      // Generate unique slug automatically
      const slug = `org-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Create organization with auto-generated slug
      const organizationData = {
        ...result.data,
        slug
      };
      const organization = await storage.createOrganization(organizationData);
      
      // Update user to be admin of this organization
      await storage.updateUserOrganization(req.user!.id, organization.id, "admin");
      await storage.markUserOnboarded(req.user!.id);

      res.status(201).json(organization);
    } catch (error) {
      console.error("Organization creation failed:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  // Get organization details
  app.get("/api/organizations/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const organization = await storage.getOrganization(parseInt(id));
      
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Check if user belongs to this organization
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== organization.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(organization);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Update organization
  app.patch("/api/organizations/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        name: z.string().min(1, "Company name is required"),
        timezone: z.string().optional(),
        businessHours: z.string().optional(),
        defaultServices: z.string().optional(),
      }).transform(data => ({
        name: data.name,
        settings: {
          timezone: data.timezone,
          businessHours: data.businessHours ? [data.businessHours] : undefined,
          defaultServices: data.defaultServices ? data.defaultServices.split(',').map(s => s.trim()) : undefined,
        }
      }));
      
      const validatedData = updateSchema.parse(req.body);
      
      // Check if user belongs to this organization and has permission
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== parseInt(id) || !["admin", "manager"].includes(user.role || "")) {
        return res.status(403).json({ error: "Access denied" });
      }



      const updatedOrganization = await storage.updateOrganization(parseInt(id), validatedData);
      res.json(updatedOrganization);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      console.error("Organization update error:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  // Get organization members
  app.get("/api/organizations/:id/members", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user belongs to this organization and has permission
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== parseInt(id) || !["admin", "manager"].includes(user.role || "")) {
        return res.status(403).json({ error: "Access denied" });
      }

      const members = await storage.getOrganizationUsers(parseInt(id));
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization members" });
    }
  });

  // Get organization invitations
  app.get("/api/organizations/:id/invitations", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user belongs to this organization and has permission
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== parseInt(id) || !["admin", "manager"].includes(user.role || "")) {
        return res.status(403).json({ error: "Access denied" });
      }

      const invitations = await storage.getOrganizationInvitations(parseInt(id));
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization invitations" });
    }
  });

  // Invite team member
  app.post("/api/organizations/:id/invite", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = inviteTeamMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      // Check if user belongs to this organization and has permission
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== parseInt(id) || !["admin", "manager"].includes(user.role || "")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      // Check if email is already a user
      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser?.organizationId) {
        return res.status(400).json({ error: "User already belongs to an organization" });
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await storage.createInvitation({
        organizationId: parseInt(id),
        email: result.data.email,
        role: result.data.role,
        invitedById: req.user!.id,
        token,
        expiresAt
      });

      res.status(201).json(invitation);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromZodError(error).toString() });
      }
      console.error("Invitation error:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  // Remove team member
  app.delete("/api/organizations/:orgId/members/:userId", authenticateToken, async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      
      // Check if user belongs to this organization and is admin
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== parseInt(orgId) || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can remove team members" });
      }

      // Prevent removing self
      if (req.user!.id === parseInt(userId)) {
        return res.status(400).json({ error: "Cannot remove yourself" });
      }

      await storage.removeUserFromOrganization(parseInt(userId));
      res.json({ message: "User removed successfully" });
    } catch (error) {
      console.error("Remove user error:", error);
      res.status(500).json({ error: "Failed to remove user" });
    }
  });

  // Change user role
  app.patch("/api/organizations/:orgId/members/:userId/role", authenticateToken, async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      const { role } = req.body;
      
      if (!["user", "manager", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      // Check if user belongs to this organization and is admin
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== parseInt(orgId) || user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can change user roles" });
      }

      // Prevent changing own role
      if (req.user!.id === parseInt(userId)) {
        return res.status(400).json({ error: "Cannot change your own role" });
      }

      await storage.updateUserOrganization(parseInt(userId), parseInt(orgId), role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Change role error:", error);
      res.status(500).json({ error: "Failed to change user role" });
    }
  });

  // Invite team member
  app.post("/api/invitations", authenticateToken, async (req, res) => {
    try {
      const result = inviteTeamMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(req.user!.id);
      if (!user?.organizationId || !["admin", "manager"].includes(user.role || "")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      // Check if email is already a user
      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser?.organizationId) {
        return res.status(400).json({ error: "User already belongs to an organization" });
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await storage.createInvitation({
        organizationId: user.organizationId,
        email: result.data.email,
        role: result.data.role,
        invitedById: req.user!.id,
        token,
        expiresAt
      });

      // TODO: Send invitation email
      console.log(`Invitation created for ${result.data.email} with token: ${token}`);

      res.status(201).json({ message: "Invitation sent successfully", invitationId: invitation.id });
    } catch (error) {
      console.error("Invitation creation failed:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  // Accept invitation
  app.post("/api/invitations/accept", authenticateToken, async (req, res) => {
    try {
      const result = acceptInvitationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const invitation = await storage.getInvitation(result.data.token);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation token" });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invitation has expired" });
      }

      if (invitation.acceptedAt) {
        return res.status(400).json({ error: "Invitation already accepted" });
      }

      // Check if user email matches invitation
      const user = await storage.getUser(req.user!.id);
      if (user?.email !== invitation.email) {
        return res.status(400).json({ error: "Email mismatch" });
      }

      // Accept invitation
      await storage.acceptInvitation(result.data.token);
      await storage.updateUserOrganization(req.user!.id, invitation.organizationId, invitation.role || "user");
      await storage.markUserOnboarded(req.user!.id);

      const organization = await storage.getOrganization(invitation.organizationId);
      res.json({ message: "Invitation accepted successfully", organization });
    } catch (error) {
      console.error("Invitation acceptance failed:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // Get organization team members
  app.get("/api/organizations/:id/members", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user belongs to this organization
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== parseInt(id)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const members = await storage.getOrganizationUsers(parseInt(id));
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Get organization invitations (admin/manager only)
  app.get("/api/organizations/:id/invitations", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user is admin or manager
      const user = await storage.getUser(req.user!.id);
      if (user?.organizationId !== parseInt(id) || !["admin", "manager"].includes(user.role || "")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const invitations = await storage.getOrganizationInvitations(parseInt(id));
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
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
  app.post("/api/messages", authenticateToken, async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      // Find the lead by phone number for authenticated user
      const leads = await storage.getLeads(req.user!.id);
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
    } catch (error: any) {
      console.error("Failed to send message:", error);
      
      // Provide specific error messages for different failure types
      if (error.message?.includes("needs to be verified")) {
        res.status(400).json({ 
          error: "Phone number verification required",
          details: "Trial accounts can only send to verified numbers. Please verify this number in your Twilio console or upgrade your account."
        });
      } else if (error.message?.includes("Invalid phone number")) {
        res.status(400).json({ error: "Invalid phone number format" });
      } else {
        res.status(500).json({ 
          error: "Message delivery failed", 
          details: error.message || "Unknown error occurred"
        });
      }
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
  app.get("/api/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getLeadStats(req.user!.id);
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
          // Get lead with proper owner verification via any admin (system process)
          const adminUser = await storage.getUserByEmail("test@cleanflow.com");
          if (adminUser) {
            const lead = await storage.getLead(followUp.leadId, adminUser.id);
            if (lead && lead.phone) {
              await twilioService.sendSms(lead.phone, followUp.message || "");
              await storage.markFollowUpCompleted(followUp.id);
            }
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
