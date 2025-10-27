import express from "express";
import Appointments from "../models/Appointments.js";
import Users from "../models/Users.js"; // ✅ Needed to fetch user info
import { authToken } from "../middleware/authToken.js"; // ✅ Auth middleware

const router = express.Router(); // ✅ This line was missing

router.post("/", authToken, async (req, res) => {
  try {
    const { date, time, service_Type } = req.body;
    const userId = req.user.id; // ✅ pulled from decoded token

    if (!date || !time || !service_Type) {
      return res.status(400).json({
        message: "Date, time, and service type are required.",
      });
    }

    const user = await Users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const newAppointment = new Appointments({
      userId,
      customer_Name: user.name,
      service_Type,
      mechanic: "", // left blank for admin to assign later
      date: new Date(date),
      time,
      status: "pending",
    });

    await newAppointment.save();

    res.status(201).json({
      message: "Appointment booked!",
      appointment: newAppointment,
    });
  } catch (err) {
    console.error("❌ Booking error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Public GET route for admin dashboard
router.get("/", async (req, res) => {
  try {
    const appointments = await Appointments.find().sort({ date: 1 });
    res.status(200).json({ appointments });
  } catch (err) {
    console.error("❌ Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
