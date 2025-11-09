import express from "express";
import Announcements from "../models/Announcements.js"; // adjust path as needed

const router = express.Router();

// POST: Create new announcement
router.post("/", async (req, res) => {
  try {
    const { announcementName, image, description, startDate, endDate } =
      req.body;

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
      startDate: start,
      endDate: end,
    });

    const saved = await newAnnouncement.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET: Fetch all announcements
router.get("/", async (req, res) => {
  try {
    const all = await Announcements.find().sort({ createdAt: -1 });
    res.status(200).json(all);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET: Fetch single announcement by ID
router.get("/:id", async (req, res) => {
  try {
    const announcement = await Announcements.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found." });
    }
    res.status(200).json(announcement);
  } catch (error) {
    console.error("Error fetching announcement:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
