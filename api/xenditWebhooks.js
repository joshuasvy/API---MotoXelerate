import express from "express";
import Order from "../models/Orders.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { reference_id, status, amount } = req.body;
  console.log("📦 Incoming webhook payload:", req.body);

  if (!reference_id || !status) {
    return res.status(400).send("Missing reference_id or status");
  }

  const normalizedStatus =
    status === "SUCCEEDED"
      ? "Succeeded"
      : status === "FAILED"
      ? "Failed"
      : "Pending";

  try {
    const updated = await Order.findOneAndUpdate(
      { "payment.referenceId": reference_id },
      {
        "payment.status": status,
        "payment.amount": amount,
        "payment.paidAt": new Date(),
        status: normalizedStatus,
      }
    );

    if (!updated) {
      console.warn("⚠️ No matching order for reference_id:", reference_id);
      return res.status(404).send("Order not found");
    }

    console.log("✅ Payment + Order status updated:", reference_id, status);
    res.status(200).send("Webhook received");
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).send("Error processing webhook");
  }
});

export default router;
