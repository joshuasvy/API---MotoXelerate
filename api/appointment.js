import express from "express";
import Appointments from "../models/Appointments.js";

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("📥 Appointment route hit:", req.body);
  try {
    const { userId, date, time } = req.body;

    if (!userId || !date || !time) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // const parsedDate = new Date(date);
    // if (isNaN(parsedDate)) {
    //   return res.status(400).json({ message: "Invalid date format." });
    // }

    const newAppointment = new Appointments({
      userId,
      date,
      time,
    });

    await newAppointment.save();

    res.status(201).json({
      message: "Appointment booked!",
      appointment: newAppointment,
    });
  } catch (err) {
    console.error("❌ Appointment save error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
