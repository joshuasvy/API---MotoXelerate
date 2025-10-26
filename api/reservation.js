import express from "express";
import Reservations from "../models/Reservations.js";

const router = express.Router();

// Create a new reservation
router.post("/", async (req, res) => {
  console.log("📥 Reservation route hit:", req.body);
  try {
    const { name, serviceType, mechanic, schedule, time, fee, status } =
      req.body;

    // Basic validation
    const fields = [name, serviceType, mechanic, schedule, time, fee];
    if (fields.some((f) => f === undefined || f === null || f === "")) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (isNaN(Number(fee))) {
      return res.status(400).json({ message: "Fee must be a valid number" });
    }

    const newReservation = new Reservations({
      name,
      serviceType,
      mechanic,
      schedule,
      time,
      fee,
      status,
    });

    await newReservation.save();
    res
      .status(201)
      .json({ message: "Reservation created", reservation: newReservation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
