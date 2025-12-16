import { broadcastEntity } from "../utils/broadcast.js";
import mongoose from "mongoose";
import express from "express";
import NotificationLog from "../models/NotificationLog.js";
import Orders from "../models/Orders.js";
import Appointments from "../models/Appointments.js";

const router = express.Router();

// Mark all notifications for a specific user as read
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

// Mark all notifications for admin as read
router.put("/mark-read", async (req, res) => {
  try {
    const result = await NotificationLog.updateMany(
      { readAt: null },
      { $set: { readAt: new Date() } }
    );
    broadcastEntity(
      "notification",
      { markedCount: result.modifiedCount, action: "mark-read" },
      "update"
    );

    return res.json({ success: true, marked: result.modifiedCount });
  } catch (err) {
    console.error("❌ Failed to mark all notifications:", err.message);
    return res.status(500).json({ error: err.message });
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

// Fething all notifications for admin
router.get("/", async (req, res) => {
  try {
    const notifications = await NotificationLog.find({
      type: {
        $in: [
          "order",
          "CancellationRequest",
          "CancellationAccepted",
          "CancellationRejected",
        ],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error("❌ Failed to fetch admin notifications:", err.message);
    res.status(500).json({
      error: "Failed to fetch notifications",
      details: err.message,
    });
  }
});

// Fething all notifications for specific user
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

router.get("/:userId/notifications", async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn(`[WARN] Invalid userId format: ${userId}`);
    return res.status(400).json({ error: "Invalid user ID" });
  }
  try {
    console.log(`[INFO] Fetching all notifications for userId: ${userId}`);
    const notifications = await NotificationLog.find({ userId })
      .sort({ createdAt: -1 })
      .select(
        "_id orderId appointmentId type customerName message reason status createdAt updatedAt readAt"
      );
    if (!notifications || notifications.length === 0) {
      console.log(`[INFO] No notifications found for userId: ${userId}`);
      return res.status(200).json([]);
    }
    console.log(
      `[INFO] Found ${notifications.length} notifications for userId: ${userId}`
    );
    res.json(notifications);
  } catch (err) {
    console.error(
      `[ERROR] Failed to fetch notifications for userId: ${userId}`,
      err
    );
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Handle cancellation request actions (accept/reject)
router.post("/:id/action", async (req, res) => {
  const { action } = req.body;
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
      reason: requestNotif.reason,
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
