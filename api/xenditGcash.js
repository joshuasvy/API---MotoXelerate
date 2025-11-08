import express from "express";
import axios from "axios";
import https from "https";

const router = express.Router();

router.post("/", async (req, res) => {
  const { amount, userId } = req.body;

  const xenditKey = process.env.XENDIT_GCASH_API;
  if (!xenditKey) {
    console.error("❌ Missing XENDIT_GCASH_API");
    return res.status(500).json({ error: "Missing Xendit API key" });
  }

  console.log("🔐 Using Xendit key:", xenditKey.slice(0, 6), "...");

  const callbackUrl = "https://api-motoxelerate.onrender.com/api/webhooks";
  const referenceId = `gcash-${Date.now()}-${userId}`;

  const safeAmount = Math.floor(Number(amount));
  console.log("💰 Sending amount:", safeAmount);

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

  try {
    // Optional: ping Xendit to confirm connectivity
    const ping = await axios.get("https://api.xendit.co");
    console.log("✅ Xendit ping success:", ping.status);

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

    if (response.status !== 201) {
      throw new Error("Failed to create GCash charge");
    }

    console.log("📌 GCash charge created:", {
      referenceId,
      chargeId: response.data.id,
      amount: safeAmount,
      status: "Pending",
    });

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

    const errorData = err.response?.data;
    const errorStatus = err.response?.status;
    const errorHeaders = err.response?.headers;

    console.error("❌ Xendit error status:", errorStatus);
    console.error("❌ Xendit error headers:", errorHeaders);
    console.error("❌ Xendit error data:", JSON.stringify(errorData, null, 2));

    res.status(500).json({ error: "GCash payment failed" });
  }
});

export default router;
