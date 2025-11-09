import express from "express";
import Announcements from "../models/Announcements.js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST: Create new announcement with image upload
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { announcementName, description, startDate, endDate } = req.body;

    if (
      !announcementName ||
      !description ||
      !startDate ||
      !endDate ||
      !req.file
    ) {
      return res
        .status(400)
        .json({ error: "All fields including image are required." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res
        .status(400)
        .json({ error: "End date must be after start date." });
    }

    // Upload image to Cloudinary
    const stream = cloudinary.uploader.upload_stream(
      { folder: "announcements" },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ error: "Image upload failed." });
        }

        const newAnnouncement = new Announcements({
          announcementName,
          image: result.secure_url,
          description,
          startDate: start,
          endDate: end,
        });

        const saved = await newAnnouncement.save();
        res.status(201).json(saved);
      }
    );

    stream.end(req.file.buffer);
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
