import express from "express";
import Appointments from "../models/Appointments.js";
import Users from "../models/Users.js";
import { authToken } from "../middleware/authToken.js";

const router = express.Router();

router.use((req, res, next) => {
  console.log("📡 Appointment route hit:", req.method, req.originalUrl);
  next();
});

router.post("/", authToken, async (req, res) => {
  try {
    const { date, time, service_Type, service_Charge } = req.body;
    const userId = req.user.id;

    if (!date || !time || !service_Type || !service_Charge) {
      console.warn("⚠️ Missing required fields:", {
        date,
        time,
        service_Type,
        service_Charge,
      });
      return res.status(400).json({ message: "Missing required fields." });
    }

    const user = await Users.findById(userId);
    if (!user) {
      console.warn("⚠️ User not found:", userId);
      return res.status(404).json({ message: "User not found." });
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const downpaymentAmount = Math.round(Number(service_Charge) * 0.5);

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      console.warn("⚠️ Invalid date format:", date);
      return res.status(400).json({ message: "Invalid date format." });
    }

    const newAppointment = new Appointments({
      userId,
      customer_Name: fullName,
      service_Type,
      mechanic: "",
      date: parsedDate,
      time,
      service_Charge,
      status: "Pending",
      read: false,
      payment: {
        referenceId: null,
        chargeId: null,
        amount: downpaymentAmount,
        status: "Pending",
        paidAt: null,
        method: "GCash",
      },
    });

    await newAppointment.save();

    return res.status(201).json({
      message: "Appointment booked! Awaiting downpayment.",
      appointment: newAppointment,
    });
  } catch (err) {
    console.error("❌ Booking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/", authToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Only verify user if not admin
    if (req.user.role !== "admin") {
      const user = await Users.findById(userId);
      if (!user) {
        console.warn("⚠️ User not found:", userId);
        return res.status(404).json({ message: "User not found." });
      }
    }

    const appointments = await Appointments.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ appointments });
  } catch (err) {
    console.error("❌ Fetch appointments error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/user", authToken, async (req, res) => {
  try {
    console.log("📥 GET /api/appointment/user hit");
    const userId = req.user.id;

    const appointments = await Appointments.find({ userId })
      .sort({ date: -1 })
      .lean();

    return res.status(200).json({ appointments });
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/user/:userId", authToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const appointments = await Appointments.find({ userId })
      .sort({ date: -1 })
      .select(
        "customer_Name service_Type mechanic date time status service_Charge payment"
      )
      .lean();

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({ message: "No appointments found" });
    }

    return res.status(200).json({ appointments });
  } catch (err) {
    console.error("❌ Failed to fetch appointments:", err.message);
    return res.status(500).json({ error: "Internal server error" });
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

    return res
      .status(200)
      .json({ message: "Appointment updated", appointment: updated });
  } catch (err) {
    console.error("❌ Update error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/read", authToken, async (req, res) => {
  try {
    const appt = await Appointments.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!appt) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    return res.json({
      message: "Appointment marked as read",
      appointment: appt,
    });
  } catch (err) {
    console.error("❌ Read patch error:", err.message);
    return res
      .status(500)
      .json({ message: "Error updating appointment", error: err });
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

  return res.status(200).json({ message: "Appointment deleted successfully." });
});

export default router;
