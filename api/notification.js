import express from "express";
import NotificationLog from "../models/NotificationLog.js";
import Order from "../models/Orders.js";

const router = express.Router();

router.put("/:userId/mark-read", async (req, res) => {
  const { userId } = req.params;

  try {
    const unreadOrders = await Order.find({
      userId,
      "payment.status": "Succeeded",
      "items.status": "For approval",
    }).select("_id");

    const bulkOps = unreadOrders.map((order) => ({
      updateOne: {
        filter: { userId, orderId: order._id },
        update: { $setOnInsert: { readAt: new Date() } },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await NotificationLog.bulkWrite(bulkOps);
    }

    res.json({ success: true, marked: bulkOps.length });
  } catch (err) {
    console.error("❌ Failed to mark notifications as read:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

export default router;
