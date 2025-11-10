import express from "express";
import Order from "../models/Orders.js";
import Product from "../models/Product.js"; // ✅ Required for stock restoration

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("📦 Incoming webhook payload:", req.body);

  // Defensive input validation
  if (!req.body || typeof req.body !== "object") {
    console.warn("⚠️ Invalid webhook body:", req.body);
    return res.status(400).send("Invalid webhook payload");
  }

  const { reference_id, status, amount } = req.body.data || {};

  if (!reference_id || typeof reference_id !== "string") {
    console.warn("⚠️ Missing or invalid reference_id:", reference_id);
    return res.status(400).send("Missing or invalid reference_id");
  }

  if (!status || typeof status !== "string") {
    console.warn("⚠️ Missing or invalid status:", status);
    return res.status(400).send("Missing or invalid status");
  }

  // ✅ Normalize status to capitalized form
  const capitalize = (s) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const normalizedStatus = capitalize(status); // "SUCCEEDED" → "Succeeded"

  const statusMap = {
    Succeeded: "Processing",
    Failed: "Payment Failed",
    Expired: "Payment Expired",
  };

  const orderStatus = statusMap[normalizedStatus] || "Pending";

  console.log("🔍 Normalized status:", normalizedStatus);
  console.log("💰 Incoming amount:", amount);

  try {
    const updated = await Order.findOneAndUpdate(
      { "payment.referenceId": reference_id },
      {
        $set: {
          "payment.status": normalizedStatus,
          "payment.amount": amount,
          "payment.paidAt": new Date(),
          status: orderStatus,
        },
      },
      { new: true }
    );

    if (!updated) {
      console.warn("⚠️ No matching order for reference_id:", reference_id);
      return res.status(404).send("Order not found");
    }

    // ✅ Restore stock if payment failed or expired
    if (
      ["Failed", "Expired"].includes(normalizedStatus) &&
      Array.isArray(updated.items)
    ) {
      for (const item of updated.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    console.log("✅ Order updated:", {
      orderId: updated._id,
      referenceId: reference_id,
      status: normalizedStatus,
    });

    res.status(200).send("Webhook received");
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    res.status(500).send("Error processing webhook");
  }
});

export default router;
