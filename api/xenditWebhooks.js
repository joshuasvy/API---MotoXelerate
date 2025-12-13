import express from "express";
import mongoose from "mongoose";
import Order from "../models/Orders.js";
import Product from "../models/Product.js";
import Appointments from "../models/Appointments.js";
import Invoice from "../models/Invoice.js";
import { broadcastEntity } from "../utils/broadcast.js";

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

  // ✅ Normalize to uppercase
  const normalizedStatus = rawStatus.toUpperCase();

  // ✅ Map payment status to lifecycles
  const orderStatusMap = {
    SUCCEEDED: "To ship",
    FAILED: "Payment Failed",
    EXPIRED: "Payment Expired",
  };

  const appointmentStatusMap = {
    FAILED: "Cancelled",
    EXPIRED: "Cancelled",
  };

  const orderRequestStatus = orderStatusMap[normalizedStatus] || "For Approval";
  const appointmentStatus = appointmentStatusMap[normalizedStatus] || "Pending";

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // -------------------- ORDER --------------------
    let updated = await Order.findOneAndUpdate(
      { "payment.referenceId": referenceId },
      {
        $set: {
          "payment.status": normalizedStatus,
          "payment.amount": amount,
          "payment.paidAt":
            normalizedStatus === "SUCCEEDED" ? new Date() : null,
          orderRequest: orderRequestStatus,
        },
      },
      { new: true, session }
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
        ["FAILED", "EXPIRED"].includes(normalizedStatus) &&
        Array.isArray(updated.items)
      ) {
        for (const item of updated.items) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } },
            { session }
          );
        }
      }

      // ✅ Update linked invoice + broadcast
      const updatedOrderInvoice = await Invoice.findOneAndUpdate(
        { sourceId: updated._id, sourceType: "Order" },
        {
          paymentStatus: normalizedStatus,
          status: normalizedStatus === "SUCCEEDED" ? "Paid" : "Unpaid",
          paidAt: normalizedStatus === "SUCCEEDED" ? new Date() : null,
        },
        { new: true, session }
      );

      if (updatedOrderInvoice) {
        broadcastEntity("invoice", updatedOrderInvoice.toObject(), "update");
        console.log("📡 Broadcasted invoice:update", {
          invoiceId: updatedOrderInvoice._id,
          sourceId: updatedOrderInvoice.sourceId,
          paymentStatus: updatedOrderInvoice.paymentStatus,
        });
      }

      await session.commitTransaction();
      session.endSession();
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
            normalizedStatus === "SUCCEEDED" ? new Date() : null,
          status: appointmentStatus,
        },
      },
      { new: true, session }
    );

    if (!updated) {
      console.warn(
        "⚠️ No matching Order or Appointment for referenceId:",
        referenceId
      );
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send("Record not found");
    }

    console.log("✅ Appointment updated:", {
      appointmentId: updated._id,
      referenceId,
      paymentStatus: normalizedStatus,
      status: updated.status,
    });

    const updatedInvoice = await Invoice.findOneAndUpdate(
      { sourceId: updated._id, sourceType: "Appointment" },
      {
        paymentStatus: normalizedStatus,
        status: normalizedStatus === "SUCCEEDED" ? "Paid" : "Unpaid",
        paidAt: normalizedStatus === "SUCCEEDED" ? new Date() : null,
        appointmentStatus: updated.status,
        mechanic: updated.mechanic,
        date: updated.date,
        time: updated.time,
      },
      { new: true, session }
    );

    if (updatedInvoice) {
      broadcastEntity("invoice", updatedInvoice.toObject(), "update");
      console.log("📡 Broadcasted invoice:update", {
        invoiceId: updatedInvoice._id,
        sourceId: updatedInvoice.sourceId,
        appointmentStatus: updatedInvoice.appointmentStatus,
        mechanic: updatedInvoice.mechanic,
        date: updatedInvoice.date,
        time: updatedInvoice.time,
      });
    }

    await session.commitTransaction();
    session.endSession();
    return res.status(200).send("Webhook received (Appointment)");
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    console.error(
      "❌ Webhook processing error:",
      err.message,
      err.stack,
      req.body
    );
    return res.status(500).send("Error processing webhook");
  }
});

export default router;
