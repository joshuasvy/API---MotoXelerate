import express from "express";
import mongoose from "mongoose";
import Users from "../models/Users.js";
import { authToken } from "../middleware/authToken.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import Orders from "../models/Orders.js";

const router = express.Router();
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload profile image to Cloudinary
router.post("/upload/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "user_profile", // ✅ optional folder
            upload_preset: "MotoXelerate", // ✅ correct preset name
          },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req);
    const hostedImageUrl = result.secure_url;

    const updatedUser = await Users.findByIdAndUpdate(
      id,
      { image: hostedImageUrl },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Cloudinary image uploaded for user:", updatedUser._id);
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update user image via PUT
router.put("/:id", authToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;

    const updatedUser = await Users.findByIdAndUpdate(
      id,
      { image },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("❌ PUT /user/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /me
router.get("/me", authToken, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      contact: user.contact,
      address: user.address,
      role: user.role,
      image: user.image || "", // ✅ fallback if image is missing
    });
  } catch (err) {
    console.error("❌ /me route error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, address, contact, email, password } = req.body;

    console.log("📥 Registration attempt:", {
      firstName,
      lastName,
      address,
      contact,
      email,
      password,
    });

    if (
      !firstName ||
      !lastName ||
      !address ||
      !contact ||
      !email ||
      !password
    ) {
      console.warn("⚠️ Missing required fields");
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      console.warn("⚠️ Email already registered:", email);
      return res.status(409).json({ message: "Email already exists." });
    }

    const newUser = new Users({
      firstName,
      lastName,
      address,
      contact,
      email,
      password, // plain password — schema will hash it
    });

    await newUser.save();
    console.log("✅ User registered:", newUser._id);
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("📥 Login attempt:", { email, password });

  try {
    const user = await Users.findOne({ email });

    if (!user) {
      console.warn("❌ No user found with email:", email);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("🔍 Found user:", {
      id: user._id,
      email: user.email,
      hashedPassword: user.password,
    });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 Password match result:", isMatch);

    if (!isMatch) {
      console.warn("❌ Password mismatch for user:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET
    );
    console.log("✅ Login successful. Token generated for user:", user._id);

    res.json({ message: "Login successful", token, user });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /all
router.get("/all", async (req, res) => {
  try {
    const users = await Users.find();
    res.json(users);
  } catch (err) {
    console.error("❌ Fetch users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📦 Get all users
router.get("/users", async (req, res) => {
  try {
    const users = await Users.find().select(
      "firstName lastName contact email address"
    );
    res.status(200).json(users);
  } catch (err) {
    console.error("❌ Failed to fetch users:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:userId/order-updates", async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn(`[WARN] Invalid userId format: ${userId}`);
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    console.log(`[INFO] Fetching order updates for userId: ${userId}`);

    const updates = await Orders.find({ userId })
      .sort({ updatedAt: -1 })
      .select("_id updatedAt items") // include order ID and items
      .populate({
        path: "items.product",
        select: "_id productName image", // include product name and image
      });

    if (!updates || updates.length === 0) {
      console.log(`[INFO] No order updates found for userId: ${userId}`);
      return res.status(200).json([]);
    }

    console.log(
      `[INFO] Found ${updates.length} order updates for userId: ${userId}`
    );
    res.json(updates);
  } catch (err) {
    console.error(
      `[ERROR] Failed to fetch order updates for userId: ${userId}`,
      err
    );
    res.status(500).json({ error: "Failed to fetch order updates" });
  }
});

router.get("/:userId/unread-count", async (req, res) => {
  const { userId } = req.params;

  try {
    // 🔍 Find all relevant orders with at least one item "For approval"
    const allOrders = await Orders.find({
      userId,
      "payment.status": "Succeeded",
      items: { $elemMatch: { status: "For approval" } },
    }).select("_id");

    console.log("🔍 Matching orders:", allOrders.length);

    // ✅ Fetch read logs AFTER orders are retrieved
    const readLogs = await NotificationLog.find({
      userId,
      orderId: { $in: allOrders.map((o) => o._id) },
    }).select("orderId");

    console.log("📘 Read logs found:", readLogs.length);

    // 🧠 Compute unread count
    const readOrderIds = new Set(readLogs.map((log) => log.orderId.toString()));
    const unreadCount = allOrders.filter(
      (o) => !readOrderIds.has(o._id.toString())
    ).length;

    res.json({ unreadCount });
  } catch (err) {
    console.error("❌ Failed to count unread notifications:", err);
    res.status(500).json({ error: "Failed to count unread notifications" });
  }
});

export default router;
