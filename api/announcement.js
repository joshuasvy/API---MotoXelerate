import express from "express";
import Announcements from "../models/Announcements.js"; // adjust path as needed

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { announcementName, image, description, startDate, endDate } =
      req.body;

    // Basic validation
    if (!announcementName || !image || !description || !startDate || !endDate) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res
        .status(400)
        .json({ error: "End date must be after start date." });
    }

    const newAnnouncement = new Announcements({
      announcementName,
      image,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    const saved = await newAnnouncement.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
