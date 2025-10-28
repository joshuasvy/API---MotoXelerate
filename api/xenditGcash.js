import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/", async (req, res) => {
  const { amount, userId } = req.body;

  const xenditKey = process.env.XENDIT_GCASH_API;
  if (!xenditKey) {
    throw new Error("Missing XENDIT_GCASH_API in environment variables");
  }

  const payload = {
    reference_id: `gcash-${Date.now()}`,
    currency: "PHP",
    amount: 1000,
    checkout_method: "ONE_TIME_PAYMENT",
    channel_code: "PH_GCASH",
    channel_properties: {
      success_redirect_url: "myapp://gcash-success",
      failure_redirect_url: "myapp://gcash-failure",
    },
    callback_url:
      "https://api-motoxelerate.onrender.com/api/xenditGcash/webhook",
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
          "x-callback-url": payload.callback_url,
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
