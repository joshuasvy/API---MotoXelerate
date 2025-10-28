import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/", async (req, res) => {
  const { amount, userId } = req.body;

  const xenditKey = process.env.XENDIT_GCASH_API;
  if (!xenditKey) {
    throw new Error("Missing XENDIT_GCASH_API in environment variables");
  }

  const callbackUrl = "https://api-motoxelerate.onrender.com/api/gcash/webhook";

  const payload = {
    reference_id: `gcash-${Date.now()}`,
    currency: "PHP",
    amount: amount || 1000, // use dynamic amount if provided
    checkout_method: "ONE_TIME_PAYMENT",
    channel_code: "PH_GCASH",
    channel_properties: {
      success_redirect_url: "myapp://gcash-success",
      failure_redirect_url: "myapp://gcash-failure",
    },
    // ❌ Do NOT include callback_url here
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
          "x-callback-url": callbackUrl,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "GCash payment failed" });
  }
});

export default router;
