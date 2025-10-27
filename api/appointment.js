import express from "express";
import Appointments from "../models/Appointments.js";
import Users from "../models/Users.js"; // ✅ Needed to fetch user info
import { authToken } from "../middleware/authToken.js"; // ✅ Auth middleware

const router = express.Router(); // ✅ This line was missing

router.post("/", authToken, async (req, res) => {
  console.log("📥 Incoming body:", req.body);
  try {
    const { date, time, service_Type, service_Charge } = req.body;
    const userId = req.user.id; // ✅ pulled from decoded token

    if (!date || !time || !service_Type || !service_Charge) {
      return res.status(400).json({
        message: "Date, time, service type, and service charge are required.",
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
      service_Charge,
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
  console.log("📥 GET /api/appointment hit");
  try {
    const appointments = await Appointments.find().sort({ date: 1 });
    res.status(200).json({
      message: "Route is working!",
      appointments,
    });
  } catch (err) {
    console.error("❌ Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", authToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { id } = req.params;
    const deleted = await Appointments.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    res.status(200).json({ message: "Appointment deleted successfully." });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
