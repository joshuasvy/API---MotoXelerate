import express from "express";
import NotificationLog from "../models/NotificationLog.js";

const router = express.Router();

router.put("/:userId/mark-read", async (req, res) => {
  const { userId } = req.params;

  try {
    await NotificationLog.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    console.log(`🧹 Marked ${result.modifiedCount} notifications as read`);
    res.json({ success: true, marked: result.modifiedCount });
  } catch (err) {
    console.error("❌ Failed to mark notifications as read:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

export default router;
