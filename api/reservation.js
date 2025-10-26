import express from "express";
import Reservations from "../models/Reservations.js";

const router = express.Router();

// ✅ Create a new reservation
router.post("/", async (req, res) => {
  try {
    const { name, serviceType, mechanic, schedule, time, fee, status } =
      req.body;

    // Validate required fields
    if (
      !name?.trim() ||
      !serviceType?.trim() ||
      !mechanic?.trim() ||
      !schedule?.trim() ||
      !time?.trim() ||
      fee === undefined ||
      fee === null ||
      fee === ""
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate fee
    const numericFee = Number(fee);
    if (isNaN(numericFee)) {
      return res
        .status(400)
        .json({ message: "Service fee must be a valid number" });
    }

    // Create and save reservation
    const newReservation = new Reservations({
      name: name.trim(),
      serviceType: serviceType.trim(),
      mechanic: mechanic.trim(),
      schedule: schedule.trim(),
      time: time.trim(),
      fee: numericFee,
      status: status || "Pending",
    });

    await newReservation.save();
    res.status(201).json({
      message: "✅ Reservation created successfully",
      reservation: newReservation,
    });
  } catch (err) {
    console.error("❌ Reservation POST error:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
});

// ✅ Get all reservations
router.get("/all", async (req, res) => {
  try {
    const reservations = await Reservations.find();
    res.status(200).json(reservations);
  } catch (err) {
    console.error("❌ Error fetching reservations:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
