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

    if (!amount || !userId) {
      return res.status(400).json({ error: "Missing amount or userId" });
    }

    const xenditKey = process.env.XENDIT_GCASH_API;
    if (!xenditKey) {
      return res.status(500).json({ error: "Missing Xendit API key" });
    }

    const callbackUrl = "https://api-motoxelerate.onrender.com/api/webhooks";
    const referenceId = `gcash-${userId}-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`;

    const safeAmount = Math.floor(Number(amount));
    if (isNaN(safeAmount) || safeAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const payload = {
      reference_id: referenceId,
      currency: "PHP",
      amount: safeAmount,
      checkout_method: "ONE_TIME_PAYMENT",
      channel_code: "PH_GCASH",
      channel_properties: {
        success_redirect_url: `https://api-motoxelerate.onrender.com/api/redirect/gcash-success?reference_id=${referenceId}&type=${type}`,
        failure_redirect_url: `https://api-motoxelerate.onrender.com/api/redirect/gcash-failure?reference_id=${referenceId}&type=${type}`,
      },
      callback_url: callbackUrl,
    };

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

    if (![200, 201, 202].includes(response.status)) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    if (type === "appointment" && appointmentId) {
      await Appointments.findByIdAndUpdate(appointmentId, {
        $set: {
          "payment.referenceId": referenceId,
          "payment.chargeId": response.data.id,
          "payment.amount": safeAmount,
          "payment.status": "Pending",
          "payment.paidAt": null,
          "payment.method": "GCash",
        },
      });
    } else if (type === "order" && orderId) {
      await Orders.findByIdAndUpdate(orderId, {
        $set: {
          "payment.referenceId": referenceId,
          "payment.chargeId": response.data.id,
          "payment.amount": safeAmount,
          "payment.status": "Pending",
          "payment.paidAt": null,
          "payment.method": "GCash",
        },
      });
    }

    res.json({
      checkout_url: response.data.actions.desktop_web_checkout_url,
      mobile_checkout_url: response.data.actions.mobile_web_checkout_url,
      reference_id: referenceId,
      charge_id: response.data.id,
      paid_amount: safeAmount,
    });
  } catch (err) {
    console.error("❌ GCash route error:", err.response?.data || err.message);
    res.status(500).json({ error: "GCash payment failed" });
  }
});

export default router;
