import express from "express";
import Reservations from "../models/Reservations.js";

const router = express.Router();

// Create a new reservation
router.post("/", async (req, res) => {
  const { name, serviceType, mechanic, schedule, time, fee, status } = req.body;

  if (!name || !serviceType || !mechanic || !schedule || !time || !fee) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newAppointment = new Appointments({
    name,
    serviceType,
    mechanic,
    schedule,
    time,
    fee,
    status,
  });

  await newAppointment.save();
  res
    .status(201)
    .json({ message: "Appointment booked!", appointment: newAppointment });
});

// Optional: Get all reservations
router.get("/all", async (req, res) => {
  try {
    const reservations = await Reservations.find();
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
