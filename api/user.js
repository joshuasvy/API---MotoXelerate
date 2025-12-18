import express from "express";
import mongoose from "mongoose";
import Users from "../models/Users.js";
import { authToken } from "../middleware/authToken.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { nanoid } from "nanoid";
import { sendVerificationEmail } from "../utils/email.js";
import streamifier from "streamifier";
import Orders from "../models/Orders.js";
import NotificationLog from "../models/NotificationLog.js";

dotenv.config();
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, address, contact, email, image, password } =
      req.body;

    console.log("📥 Registration attempt:", {
      firstName,
      lastName,
      address,
      contact,
      email,
      passwordPreview: password ? "[HIDDEN]" : "❌ MISSING",
    });

    // Defensive check: required fields
    if (
      !firstName ||
      !lastName ||
      !address ||
      !contact ||
      !email ||
      !password
    ) {
      console.warn("⚠️ Missing required fields:", {
        firstName: !!firstName,
        lastName: !!lastName,
        address: !!address,
        contact: !!contact,
        email: !!email,
        password: !!password,
      });
      return res.status(400).json({ message: "All fields are required." });
    }

    // Defensive check: existing user
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      console.warn("⚠️ Email already registered:", email);
      return res.status(409).json({ message: "Email already exists." });
    }

    // Generate token
    const token = nanoid(32);
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    console.log("🔑 Generated verification token:", {
      tokenPreview: token.slice(0, 6) + "...",
    });

    // Create user
    const newUser = new Users({
      firstName,
      lastName,
      address,
      contact,
      email,
      password,
      image: image || undefined,
      verified: false,
      verificationToken: token,
      verificationExpires: expires,
    });

    await newUser.save();
    console.log("💾 User saved to DB:", {
      id: newUser._id,
      email: newUser.email,
    });

    // Send email
    await sendVerificationEmail(email, token);
    console.log("📧 Verification email dispatched:", { to: email });

    res
      .status(201)
      .json({ message: "User registered. Please check your email to verify." });
  } catch (err) {
    console.error("❌ Registration error:", {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: err.message });
  }
});

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
      verified: user.verified,
    });

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 Password match result:", isMatch);

    if (!isMatch) {
      console.warn("❌ Password mismatch for user:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🚨 Block login if not verified
    if (!user.verified) {
      console.warn("⚠️ User not verified:", email);
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // optional: set token expiry
    );
    console.log("✅ Login successful. Token generated for user:", user._id);

    res.json({ message: "Login successful", token, user });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/auth/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    console.log("🔍 Verification attempt with token:", token);

    const user = await Users.findOne({ verificationToken: token });

    if (!user) {
      console.warn("⚠️ Invalid token:", token);
      return res.status(400).send("Invalid or expired verification link.");
    }

    if (user.verified) {
      console.warn("⚠️ Already verified:", user.email);
      return res.status(409).send("Email already verified.");
    }

    if (user.verificationExpires && new Date() > user.verificationExpires) {
      console.warn("⚠️ Token expired:", {
        email: user.email,
        expiredAt: user.verificationExpires,
      });
      return res
        .status(410)
        .send("Verification link expired. Please request a new one.");
    }

    user.verified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();

    console.log("✅ User verified:", { email: user.email, id: user._id });

    const redirectUrl = `${
      process.env.CLIENT_REDIRECT_URL
    }?verified=1&email=${encodeURIComponent(user.email)}`;
    console.log("↪️ Redirecting to:", redirectUrl);

    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error("❌ Verification error:", {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).send("Something went wrong.");
  }
});

router.post("/resend", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("📤 Resend verification attempt:", email);

    const user = await Users.findOne({ email });

    if (!user) {
      console.warn("⚠️ User not found for resend:", email);
      return res.status(404).json({ message: "User not found." });
    }
    if (user.verified) {
      console.warn("⚠️ Already verified, resend blocked:", email);
      return res.status(409).json({ message: "Already verified." });
    }

    const token = nanoid(32);
    user.verificationToken = token;
    user.verificationExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    console.log("🔑 New verification token generated for resend:", {
      tokenPreview: token.slice(0, 6) + "...",
    });

    await sendVerificationEmail(email, token);
    console.log("📧 Resent verification email:", email);

    res.json({ message: "Verification email resent." });
  } catch (err) {
    console.error("❌ Resend error:", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

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
    console.log("Raw user data:", users);
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

router.get("/:userId/unread-count", async (req, res) => {
  const { userId } = req.params;

  try {
    const unreadCount = await NotificationLog.countDocuments({
      userId,
      readAt: null, // only unread logs
    });

    console.log("🔴 Final unread count:", unreadCount);
    res.json({ unreadCount });
  } catch (err) {
    console.error("❌ Failed to count unread notifications:", err);
    res.status(500).json({ error: "Failed to count unread notifications" });
  }
});

export default router;
