import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authenticateToken } from "../auth";
import { insertAppointmentSchema } from "@shared/schema";

const router = Router();

// Get all appointments
router.get("/", authenticateToken, async (req, res) => {
  try {
    const appointments = await storage.getAppointments();
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Create appointment
router.post("/", authenticateToken, async (req, res) => {
  try {
    const appointmentData = insertAppointmentSchema.parse(req.body);
    const appointment = await storage.createAppointment(appointmentData);
    res.status(201).json(appointment);
  } catch (error) {
    console.error("Error creating appointment:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid appointment data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create appointment" });
    }
  }
});

// Update appointment status
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const appointment = await storage.updateAppointmentStatus(parseInt(id), status);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

export default router;