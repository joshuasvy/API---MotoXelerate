import { authToken } from "../middleware/authToken.js";
import { broadcastEntity } from "../utils/broadcast.js";
import express from "express";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Appointments from "../models/Appointments.js";
import Users from "../models/Users.js";
import NotificationLog from "../models/NotificationLog.js";

const router = express.Router();

router.post("/", authToken, async (req, res) => {
  console.log("📥 Incoming appointment payload:", req.body);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { date, time, service_Type, service_Charge } = req.body;
    const userId = req.user.id;

    if (!date || !time || !service_Type || !service_Charge) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const user = await Users.findById(userId).session(session);
    if (!user) throw new Error(`User not found: ${userId}`);

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const downpaymentAmount = Math.round(Number(service_Charge) * 0.5);

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    // ✅ Create Appointment
    const newAppointment = new Appointments({
      userId: user._id,
      customer_Name: fullName,
      customerEmail: user.email,
      customerPhone: user.contact,
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

    const savedAppointment = await newAppointment.save({ session });
    console.log("📦 Saved appointment:", savedAppointment);

    // ✅ Create Invoice linked to Appointment
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(
      Math.random() * 10000
    )}`;

    const newInvoice = new Invoice({
      user: user._id,
      invoiceNumber,
      sourceType: "Appointment",
      sourceId: savedAppointment._id,
      customerName: fullName,
      customerEmail: user.email,
      customerPhone: user.contact,
      paymentMethod: "GCash",
      paymentStatus: "Pending",
      referenceId: savedAppointment.payment.referenceId,
      items: [
        {
          description: service_Type,
          quantity: 1,
          unitPrice: Number(service_Charge),
          lineTotal: Number(service_Charge),
        },
      ],
      subtotal: Number(service_Charge),
      total: Number(service_Charge),
      status: "Unpaid",
      appointmentId: savedAppointment._id,
      serviceType: service_Type,
      mechanic: "",
      date: parsedDate,
      time,
      appointmentStatus: "Pending",
    });

    await newInvoice.save({ session });

    // ✅ NotificationLog entry inside transaction
    const notif = new NotificationLog({
      appointmentId: savedAppointment._id,
      type: "appointment",
      customerName: fullName,
      message: `${fullName} booked an appointment for ${service_Type} on ${parsedDate.toDateString()} at ${time}.`,
      status: savedAppointment.status,
    });
    await notif.save({ session });
    console.log(
      "📒 NotificationLog created for appointment:",
      savedAppointment._id
    );

    // ✅ Commit transaction
    await session.commitTransaction();
    await session.endSession();
    console.log(
      "✅ Transaction committed for appointment:",
      savedAppointment._id
    );

    // ✅ Broadcast AFTER commit
    broadcastEntity("appointment", savedAppointment.toObject(), "update");
    broadcastEntity("invoice", newInvoice.toObject(), "update");

    // 🔎 Normalize notification payload for frontend (same style as Order route)
    const notifPayload = {
      _id: notif._id.toString(), // ✅ use _id for consistency
      appointmentId: savedAppointment._id.toString(),
      customerName: fullName,
      type: "appointment",
      message: notif.message,
      status: notif.status,
      createdAt: notif.createdAt,
      userId: user._id.toString(),
      readAt: notif.readAt ?? null, // ✅ include readAt
    };

    broadcastEntity("notification", notifPayload, "create");

    return res.status(201).json({
      message: "Appointment booked! Awaiting downpayment.",
      appointment: savedAppointment,
      invoice: newInvoice,
      notification: notifPayload,
    });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    await session.endSession();
    console.error("❌ Booking error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/all", authToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }

  const appointments = await Appointments.find()
    .populate("userId", "firstName lastName email")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ appointments });
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

    const appointments =
      req.user.role === "admin"
        ? await Appointments.find().sort({ createdAt: -1 }).lean()
        : await Appointments.find({ userId }).sort({ createdAt: -1 }).lean();

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

router.get("/:id", authToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query =
      req.user.role === "admin"
        ? { _id: id }
        : { _id: id, userId: req.user.id };

    const appointment = await Appointments.findOne(query).lean();

    if (!appointment) {
      console.warn("⚠️ Appointment not found:", id);
      return res.status(404).json({ message: "Appointment not found." });
    }

    return res.status(200).json(appointment);
  } catch (err) {
    console.error("❌ Fetch single appointment error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Handles status update for appointments
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

    // ✅ If status was updated, log and broadcast a notification
    if (updates.status) {
      const notif = await NotificationLog.create({
        appointmentId: updated._id,
        type: "appointment", // unified single value
        customerName: updated.customer_Name,
        message: `${updated.customer_Name}'s appointment for ${updated.service_Type} has been ${updates.status}.`,
        status: updates.status,
      });

      console.log(
        `📢 Admin notification logged for appointment ${updated._id} status: ${updates.status}`
      );

      // Broadcast notification so frontend receives it
      broadcastEntity("notification", notif, "create");
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
