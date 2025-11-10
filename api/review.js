import express from "express";
import Reviews from "../models/Reviews.js";

const router = express.Router();

// ✅ Create a new review
router.post("/", async (req, res) => {
  try {
    const { orderId, productId, userId, rate, review } = req.body;

    console.log("📥 Incoming review payload:", {
      orderId,
      productId,
      userId,
      rate,
      review,
    });

    // 🔒 Validate required fields
    if (!orderId || !productId || !userId || !rate) {
      console.warn("⚠️ Missing required fields:", {
        orderIdMissing: !orderId,
        productIdMissing: !productId,
        userIdMissing: !userId,
        rateMissing: !rate,
      });
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (typeof rate !== "number" || rate < 1 || rate > 5) {
      console.warn("⚠️ Invalid rating value:", rate);
      return res
        .status(400)
        .json({ message: "Rating must be a number between 1 and 5." });
    }

    // 🔍 Check for existing review
    const existing = await Reviews.findOne({ orderId, userId });
    if (existing) {
      console.warn("⛔ Duplicate review detected for order:", orderId);
      return res
        .status(409)
        .json({ message: "Review already submitted for this order." });
    }

    const cleanReview = typeof review === "string" ? review.trim() : "";

    // ✅ Create and save review
    const newReview = new Reviews({
      orderId,
      productId,
      userId,
      rate,
      review: cleanReview,
    });

    await newReview.save();
    console.log("✅ Review saved successfully:", {
      id: newReview._id,
      userId,
      productId,
      rate,
    });

    res
      .status(201)
      .json({ message: "Review submitted successfully.", review: newReview });
  } catch (err) {
    console.error("❌ Unexpected error in review submission:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ✅ Fetch reviews for a product
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    console.log("🔍 Fetching reviews for product:", productId);

    if (!productId || productId.length !== 24) {
      console.warn("⚠️ Invalid productId format:", productId);
      return res.status(400).json({ message: "Invalid productId." });
    }

    const reviews = await Reviews.find({ productId })
      .sort({ createdAt: -1 })
      // .populate("userId", "firstName lastName image");

    console.log(`✅ Found ${reviews.length} reviews`);
    res.json(reviews);
  } catch (err) {
    console.error("❌ Failed to fetch reviews:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
