import express from "express";
import Users from "../models/Users.js";
import { authToken } from "../middleware/authToken.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

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
            folder: "e-commerce", // ✅ matches your preset folder
            upload_preset: "MotoXelerate", // ✅ your preset name
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
      image: user.image, // ✅ include image field
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

    if (
      !firstName ||
      !lastName ||
      !address ||
      !contact ||
      !email ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const newUser = new Users({
      firstName,
      lastName,
      address,
      contact,
      email,
      password,
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Users.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);

    res.json({ message: "Login successful", token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /all
router.get("/all", async (req, res) => {
  try {
    const users = await Users.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
