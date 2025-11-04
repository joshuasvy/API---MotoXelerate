import express from "express";
import Appointments from "../models/Appointments.js";
import Users from "../models/Users.js"; // ✅ Needed to fetch user info
import { authToken } from "../middleware/authToken.js"; // ✅ Auth middleware

const router = express.Router(); // ✅ This line was missing

router.use((req, res, next) => {
  console.log("📡 Appointment route hit:", req.method, req.originalUrl);
  next();
});

router.post("/", authToken, async (req, res) => {
  try {
    const { date, time, service_Type, service_Charge } = req.body;
    const userId = req.user.id;

    if (!date || !time || !service_Type || !service_Charge) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const user = await Users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const newAppointment = new Appointments({
      userId,
      customer_Name: fullName,
      service_Type,
      mechanic: "",
      date: new Date(date),
      time,
      service_Charge,
      status: "pending",
    });

    await newAppointment.save();
    res
      .status(201)
      .json({ message: "Appointment booked!", appointment: newAppointment });
  } catch (err) {
    console.error("❌ Booking error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

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

router.get("/user", authToken, async (req, res) => {
  console.log("📥 GET /api/appointment/user hit");
  const userId = req.user.id;
  const appointments = await Appointments.find({ userId }).sort({ date: -1 });
  res.status(200).json(appointments);
});

// 📅 Get recent appointment by userId (public)
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const appointment = await Appointments.findOne({ userId })
      .sort({ date: -1 }) // ✅ most recent
      .select("service_Type date time status service_Charge");

    if (!appointment) {
      return res.status(404).json({ message: "No appointment found" });
    }

    res.status(200).json(appointment);
  } catch (err) {
    console.error("❌ Failed to fetch appointment:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await Appointments.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res
      .status(200)
      .json({ message: "Appointment updated", appointment: updated });
  } catch (err) {
    console.error("❌ Update error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", authToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }

  const { id } = req.params;
  const deleted = await Appointments.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({ message: "Appointment not found." });
  }

  res.status(200).json({ message: "Appointment deleted successfully." });
});

export default router;
