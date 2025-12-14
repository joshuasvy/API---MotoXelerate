import { broadcastEntity } from "../utils/socketBroadcast.js";
import express from "express";
import NotificationLog from "../models/NotificationLog.js";

const router = express.Router();

/**
 * ✅ Mark all notifications as read for a user
 * PUT /api/notifications/:userId/mark-read
 */
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

    return res.json({ success: true, marked: result.modifiedCount });
  } catch (err) {
    console.error("❌ Failed to mark all notifications:", err.message);
    return res.status(500).json({
      error: "Failed to mark notifications as read",
      details: err.message,
    });
  }
});

/**
 * ✅ Mark a single notification as read
 * PATCH /api/notifications/:id/read
 */
router.patch("/:id/read", async (req, res) => {
  try {
    const notif = await NotificationLog.findById(req.params.id);
    if (!notif) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notif.readAt = new Date();
    await notif.save();

    broadcastEntity(
      "notification",
      { id: notif._id.toString(), action: "mark-read" },
      "update"
    );

    return res.json({ success: true, notification: notif });
  } catch (err) {
    console.error("❌ Failed to mark notification:", err.message);
    return res.status(500).json({
      error: "Failed to mark notification as read",
      details: err.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const notifications = await NotificationLog.find({})
      .sort({ createdAt: -1 }) // newest first
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error("❌ Failed to fetch all notifications:", err.message);
    res.status(500).json({
      error: "Failed to fetch notifications",
      details: err.message,
    });
  }
});

/**
 * ✅ Fetch notifications for a user
 * GET /api/notifications/:userId
 */
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
