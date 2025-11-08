import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/", async (req, res) => {
  const { amount, userId } = req.body;

  const xenditKey = process.env.XENDIT_GCASH_API;
  if (!xenditKey) {
    throw new Error("Missing XENDIT_GCASH_API in environment variables");
  }

  // ✅ Define your webhook endpoint (must match your deployed backend route)
  const callbackUrl =
    "https://api-motoxelerate.onrender.com/api/xenditWebhooks";

  const referenceId = `gcash-${Date.now()}-${userId}`;

  const payload = {
    reference_id: referenceId,
    currency: "PHP",
    amount: amount || 1000,
    checkout_method: "ONE_TIME_PAYMENT",
    channel_code: "PH_GCASH",
    channel_properties: {
      success_redirect_url: "myapp://gcash-success",
      failure_redirect_url: "myapp://gcash-failure",
    },
  };

  try {
    const response = await axios.post(
      "https://api.xendit.co/ewallets/charges",
      payload,
      {
        auth: {
          username: xenditKey,
          password: "",
        },
        headers: {
          "Content-Type": "application/json",
          "x-callback-url": callbackUrl, // ✅ Correct placement
        },
      }
    );

    console.log("📌 GCash charge created:", {
      referenceId,
      chargeId: response.data.id,
      amount,
      status: "PENDING",
    });

    res.json({
      checkout_url: response.data.actions.desktop_web_checkout_url,
      reference_id: referenceId,
      charge_id: response.data.id,
      paid_amount: amount,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "GCash payment failed" });
  }
});

export default router;
