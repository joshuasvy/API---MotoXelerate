import express from "express";
import NotificationLog from "../models/NotificationLog.js";
import { broadcastEntity } from "../utils/socketBroadcast.js";

const router = express.Router();

router.put("/:userId/mark-read", async (req, res) => {
  const { userId } = req.params;

  try {
    console.log("🛠 Notification mark-read triggered");
    console.log("Target userId:", userId);

    const result = await NotificationLog.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    console.log(
      `✅ Marked ${result.modifiedCount} notifications as read for user ${userId}`
    );

    broadcastEntity(
      "notification",
      {
        userId,
        markedCount: result.modifiedCount,
        action: "mark-read",
      },
      "update"
    );

    res.json({ success: true, marked: result.modifiedCount });
  } catch (err) {
    console.error("❌ Failed to mark notifications as read:", err.message);
    res.status(500).json({
      error: "Failed to mark notifications as read",
      details: err.message,
    });
  }
});

router.patch("/:id/read", authToken, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order marked as read", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/read", authToken, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    );
    if (!appointment)
      return res.status(404).json({ error: "Appointment not found" });
    res.json({ message: "Appointment marked as read", appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    console.log("🛠 Fetch notifications triggered for user:", userId);

    const notifications = await NotificationLog.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      `✅ Found ${notifications.length} notifications for user ${userId}`
    );

    res.json(notifications);
  } catch (err) {
    console.error("❌ Failed to fetch notifications:", err.message);
    res
      .status(500)
      .json({ error: "Failed to fetch notifications", details: err.message });
  }
});

export default router;
