import express from "express";
import Order from "../models/Orders.js";
import Product from "../models/Product.js";
import Appointments from "../models/Appointments.js";
import Invoice from "../models/Invoice.js"; // ✅ import Invoice model

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("📦 Incoming webhook payload:", req.body);

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).send("Invalid webhook payload");
  }

  const data = req.body.data || {};
  const referenceId = data.reference_id;
  const rawStatus = data.status;
  const amount = data.charge_amount ?? null;

  if (!referenceId || typeof referenceId !== "string") {
    return res.status(400).send("Missing or invalid referenceId");
  }
  if (!rawStatus || typeof rawStatus !== "string") {
    return res.status(400).send("Missing or invalid status");
  }

  const capitalize = (s) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const normalizedStatus = capitalize(rawStatus);

  // Map payment status to orderRequest lifecycle
  const orderStatusMap = {
    Succeeded: "To ship",
    Failed: "Payment Failed",
    Expired: "Payment Expired",
  };

  // Map payment status to appointment lifecycle
  const appointmentStatusMap = {
    Failed: "Cancelled",
    Expired: "Cancelled",
  };

  const orderRequestStatus = orderStatusMap[normalizedStatus] || "For Approval";
  const appointmentStatus = appointmentStatusMap[normalizedStatus] || "Pending";

  try {
    // -------------------- ORDER --------------------
    let updated = await Order.findOneAndUpdate(
      { "payment.referenceId": referenceId },
      {
        $set: {
          "payment.status": normalizedStatus,
          "payment.amount": amount,
          "payment.paidAt":
            normalizedStatus === "Succeeded" ? new Date() : null,
          orderRequest: orderRequestStatus,
        },
      },
      { new: true }
    );

    if (updated) {
      console.log("✅ Order updated:", {
        orderId: updated._id,
        referenceId,
        paymentStatus: normalizedStatus,
        orderRequest: updated.orderRequest,
      });

      // Roll back stock if payment failed/expired
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

      // ✅ Update linked invoice
      await Invoice.findOneAndUpdate(
        { sourceId: updated._id, sourceType: "Order" },
        {
          paymentStatus: normalizedStatus,
          status: normalizedStatus === "Succeeded" ? "Paid" : "Unpaid",
          paidAt: normalizedStatus === "Succeeded" ? new Date() : null,
        }
      );

      return res.status(200).send("Webhook received (Order)");
    }

    // -------------------- APPOINTMENT --------------------
    updated = await Appointments.findOneAndUpdate(
      { "payment.referenceId": referenceId },
      {
        $set: {
          "payment.status": normalizedStatus,
          "payment.amount": amount,
          "payment.paidAt":
            normalizedStatus === "Succeeded" ? new Date() : null,
        },
      },
      { new: true }
    );

    if (!updated) {
      console.warn(
        "⚠️ No matching Order or Appointment for referenceId:",
        referenceId
      );
      return res.status(404).send("Record not found");
    }

    console.log("✅ Appointment updated:", {
      appointmentId: updated._id,
      referenceId,
      paymentStatus: normalizedStatus,
      status: updated.status,
    });

    // ✅ Update linked invoice
    await Invoice.findOneAndUpdate(
      { sourceId: updated._id, sourceType: "Appointment" },
      {
        paymentStatus: normalizedStatus,
        status: normalizedStatus === "Succeeded" ? "Paid" : "Unpaid",
        paidAt: normalizedStatus === "Succeeded" ? new Date() : null,
      }
    );

    return res.status(200).send("Webhook received (Appointment)");
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    return res.status(500).send("Error processing webhook");
  }
});

export default router;
