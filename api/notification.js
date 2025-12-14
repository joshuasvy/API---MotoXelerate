import { broadcastEntity } from "../utils/socketBroadcast.js";
import express from "express";
import NotificationLog from "../models/NotificationLog.js";

const router = express.Router();

// ✅ Mark all notifications as read for a user
router.put("/:userId/mark-read", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await NotificationLog.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    broadcastEntity(
      "notification",
      { userId, markedCount: result.modifiedCount, action: "mark-read" },
      "update"
    );

    res.json({ success: true, marked: result.modifiedCount });
  } catch (err) {
    res.status(500).json({
      error: "Failed to mark notifications as read",
      details: err.message,
    });
  }
});

// ✅ Mark a single notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notif = await NotificationLog.findById(req.params.id);
    if (!notif)
      return res.status(404).json({ error: "Notification not found" });

    notif.readAt = new Date();
    await notif.save();

    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(500).json({
      error: "Failed to mark notification as read",
      details: err.message,
    });
  }
});

// ✅ Fetch notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const notifications = await NotificationLog.find({
      userId: req.params.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(notifications);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch notifications", details: err.message });
  }
});

export default router;
