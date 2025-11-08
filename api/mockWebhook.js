import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("📦 Incoming mock webhook (hardcoded):", req.body);

  try {
    const forward = await axios.post(
      "https://api-motoxelerate.onrender.com/api/webhooks",
      req.body,
      { headers: { "Content-Type": "application/json" } }
    );
    console.log("🔁 Forwarded to /api/webhooks:", forward.status);
    res.status(200).send("Redirected to real webhook");
  } catch (err) {
    console.error("❌ Failed to forward webhook:", err.message);
    res.status(500).send("Forwarding failed");
  }
});

export default router;
