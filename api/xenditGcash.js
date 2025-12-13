import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import https from "https";
import Appointments from "../models/Appointments.js";
import Orders from "../models/Orders.js";

dotenv.config();
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { amount, userId, type, appointmentId, orderId } = req.body;
    console.log("🧪 Incoming GCash request:", {
      amount,
      userId,
      type,
      appointmentId,
      orderId,
    });

    // ✅ Defensive check
    if (!amount || !userId) {
      return res.status(400).json({ error: "Missing amount or userId" });
    }

    const xenditKey = process.env.XENDIT_GCASH_API;
    if (!xenditKey) {
      console.error("❌ Missing Xendit API key");
      return res.status(500).json({ error: "Missing Xendit API key" });
    }

    const safeAmount = Math.floor(Number(amount));
    if (isNaN(safeAmount) || safeAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ✅ Generate unique referenceId
    const referenceId = `XenditPay-${userId}-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`;
    console.log("🔑 Generated referenceId:", referenceId);

    // ✅ Align callback URL with Xendit expectations
    const callbackUrl =
      "https://api-motoxelerate.onrender.com/api/gcash/webhook";

    // ✅ Include orderId/appointmentId in redirect URLs
    const payload = {
      reference_id: referenceId,
      currency: "PHP",
      amount: safeAmount,
      checkout_method: "ONE_TIME_PAYMENT",
      channel_code: "PH_GCASH",
      channel_properties: {
        success_redirect_url: `https://api-motoxelerate.onrender.com/api/redirect/gcash-success?reference_id=${referenceId}&type=${type}&orderId=${
          orderId || ""
        }&appointmentId=${appointmentId || ""}`,
        failure_redirect_url: `https://api-motoxelerate.onrender.com/api/redirect/gcash-failure?reference_id=${referenceId}&type=${type}&orderId=${
          orderId || ""
        }&appointmentId=${appointmentId || ""}`,
      },
      callback_url: callbackUrl,
    };
    console.log("📦 Sending payload to Xendit:", payload);

    const response = await axios.post(
      "https://api.xendit.co/ewallets/charges",
      payload,
      {
        timeout: 10000,
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
        auth: { username: xenditKey, password: "" },
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("✅ Xendit response status:", response.status);
    console.log("✅ Xendit response data:", response.data);

    if (![200, 201, 202].includes(response.status)) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    // ✅ Update appointment or order with payment details
    let updatedDoc = null;
    if (type === "appointment" && appointmentId) {
      updatedDoc = await Appointments.findByIdAndUpdate(
        appointmentId,
        {
          $set: {
            "payment.referenceId": referenceId,
            "payment.chargeId": response.data.id,
            "payment.amount": safeAmount,
            "payment.status": "Pending",
            "payment.paidAt": null,
            "payment.method": "GCash",
          },
        },
        { new: true }
      );
      console.log(
        updatedDoc
          ? `✅ Appointment updated: ${appointmentId}`
          : `⚠️ Appointment not found: ${appointmentId}`
      );
    } else if (type === "order" && orderId) {
      updatedDoc = await Orders.findByIdAndUpdate(
        orderId,
        {
          $set: {
            "payment.referenceId": referenceId,
            "payment.chargeId": response.data.id,
            "payment.amount": safeAmount,
            "payment.status": "Pending",
            "payment.paidAt": null,
            "payment.method": "GCash",
          },
        },
        { new: true }
      );
      console.log(
        updatedDoc
          ? `✅ Order updated: ${orderId}`
          : `⚠️ Order not found: ${orderId}`
      );
    } else {
      console.warn(
        "⚠️ No valid appointmentId or orderId provided for type:",
        type
      );
    }

    // ✅ Return checkout URLs to frontend
    res.json({
      checkout_url: response.data.actions?.desktop_web_checkout_url,
      mobile_checkout_url: response.data.actions?.mobile_web_checkout_url,
      reference_id: referenceId,
      charge_id: response.data.id,
      paid_amount: safeAmount,
    });
  } catch (err) {
    console.error(
      "❌ GCash route error:",
      err.message,
      err.stack,
      err.response?.data
    );
    res.status(500).json({ error: "GCash payment failed" });
  }
});

export default router;
