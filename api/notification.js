import { broadcastEntity } from "../utils/socketBroadcast.js";
import mongoose from "mongoose";
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
    const filter = mongoose.isValidObjectId(userId)
      ? { userId: new mongoose.Types.ObjectId(userId), readAt: null }
      : { userId, readAt: null };

    const result = await NotificationLog.updateMany(filter, {
      $set: { readAt: new Date() },
    });

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
      {
        id: notif._id.toString(),
        userId: notif.userId?.toString(),
        action: "mark-read",
      },
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

/**
 * ✅ Fetch all notifications (Admin mode)
 * GET /api/notifications
 */
router.get("/", async (req, res) => {
  try {
    const notifications = await NotificationLog.find({})
      .sort({ createdAt: -1 })
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
 * ✅ Fetch notifications for a specific user
 * GET /api/notifications/:userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    let query = {};

    if (mongoose.isValidObjectId(userId)) {
      query = { userId: new mongoose.Types.ObjectId(userId) };
    } else {
      query = { userId };
    }

    const notifications = await NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error("❌ Error fetching notifications:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✅ Handle cancellation request actions (accept/reject)
 * POST /api/notifications/:id/action
 */
router.post("/:id/action", async (req, res) => {
  const { action } = req.body; // "accept" or "reject"
  const { id } = req.params;

  try {
    console.log("➡️ Cancellation action route hit:", { id, action });

    const requestNotif = await NotificationLog.findById(id);
    if (!requestNotif || requestNotif.type !== "CancellationRequest") {
      console.warn("⚠️ Cancellation request not found or invalid type:", id);
      return res.status(404).json({ error: "Cancellation request not found" });
    }

    // ✅ Remove the original request
    await NotificationLog.deleteOne({ _id: id });
    console.log("🗑️ Removed original CancellationRequest notification:", id);

    // ✅ Create a new outcome notification
    const newNotif = new NotificationLog({
      userId: requestNotif.userId,
      orderId: requestNotif.orderId,
      type:
        action === "accept" ? "CancellationAccepted" : "CancellationRejected",
      customerName: requestNotif.customerName,
      message:
        action === "accept"
          ? `Cancellation request accepted for ${requestNotif.customerName}`
          : `Cancellation request rejected for ${requestNotif.customerName}`,
    });
    await newNotif.save();
    console.log(
      "✅ Created new outcome notification:",
      newNotif._id.toString()
    );

    // ✅ Broadcast changes
    broadcastEntity(
      "notification",
      {
        id,
        userId: requestNotif.userId?.toString(),
        action: "delete",
      },
      "update"
    );
    broadcastEntity("notification", newNotif.toObject(), "create");
    console.log("📢 Broadcasted delete + create events");

    res.json({ success: true, notification: newNotif });
  } catch (err) {
    console.error("❌ Error handling cancellation:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
