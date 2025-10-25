import express from "express";
import Reservations from "../models/Reservations.js";

const router = express.Router();

// Create a new reservation
router.post("/", async (req, res) => {
  try {
    const { name, serviceType, mechanic, schedule, time, fee, status } =
      req.body;

    // Basic validation
    if (!name || !serviceType || !mechanic || !schedule || !time || !fee) {
      return res.status(400).json({ message: "All fields are required." });
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
    const reservations = await Reservation.find();
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
