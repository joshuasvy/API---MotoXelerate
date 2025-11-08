import express from "express";
import axios from "axios";
import https from "https";

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("📥 Incoming GCash request:", req.body);

  // Defensive input validation
  if (!req.body || typeof req.body !== "object") {
    console.warn("⚠️ Invalid request body:", req.body);
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { amount, userId } = req.body;

  if (!amount || !userId) {
    console.warn("⚠️ Missing required fields:", { amount, userId });
    return res.status(400).json({ error: "Missing amount or userId" });
  }

  const xenditKey = process.env.XENDIT_GCASH_API;
  if (!xenditKey) {
    console.error("❌ Missing XENDIT_GCASH_API");
    return res.status(500).json({ error: "Missing Xendit API key" });
  }

  console.log(
    "🔐 Key mode:",
    xenditKey.startsWith("xnd_live_") ? "LIVE" : "DEVELOPMENT"
  );
  console.log("🔐 Using Xendit key:", xenditKey.slice(0, 12), "...");

  const callbackUrl = "https://api-motoxelerate.onrender.com/api/webhooks";
  const referenceId = `gcash-${Date.now()}-${userId}`;

  const safeAmount = Math.floor(Number(amount));
  if (isNaN(safeAmount) || safeAmount <= 0) {
    console.warn("⚠️ Invalid amount:", amount);
    return res.status(400).json({ error: "Invalid amount" });
  }

  console.log("💰 Sending amount:", safeAmount);
  console.log("📎 Reference ID:", referenceId);
  console.log("🔗 Callback URL:", callbackUrl);

  const payload = {
    reference_id: referenceId,
    currency: "PHP",
    amount: safeAmount,
    checkout_method: "ONE_TIME_PAYMENT",
    channel_code: "PH_GCASH",
    channel_properties: {
      success_redirect_url: "myapp://gcash-success",
      failure_redirect_url: "myapp://gcash-failure",
    },
    callback_url: callbackUrl,
  };

  console.log("🚀 Sending charge payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      "https://api.xendit.co/ewallets/charges",
      payload,
      {
        timeout: 10000,
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
        auth: {
          username: xenditKey,
          password: "",
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📥 Xendit response status:", response.status);
    console.log(
      "📥 Xendit response data:",
      JSON.stringify(response.data, null, 2)
    );

    if (![200, 201, 202].includes(response.status)) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    res.json({
      checkout_url: response.data.actions.desktop_web_checkout_url,
      reference_id: referenceId,
      charge_id: response.data.id,
      paid_amount: safeAmount,
    });
  } catch (err) {
    console.error("❌ Axios error name:", err.name);
    console.error("❌ Axios error code:", err.code);
    console.error("❌ Axios error message:", err.message);

    if (err.response) {
      console.error("❌ Xendit error status:", err.response.status);
      console.error("❌ Xendit error headers:", err.response.headers);
      console.error(
        "❌ Xendit error data:",
        JSON.stringify(err.response.data, null, 2)
      );
    } else if (err.request) {
      console.error("❌ No response received from Xendit:", err.request);
    } else {
      console.error("❌ Unexpected error:", err.message);
    }

    console.error("🧨 Full error object:", err.toJSON?.() || err);

    res.status(500).json({ error: "GCash payment failed" });
  }
});

export default router;
