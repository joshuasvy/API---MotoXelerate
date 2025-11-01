import express from "express";
import multer from "multer";
import path from "path";
import Users from "../models/Users.js";
import { authToken } from "../middleware/authToken.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Serve uploaded images from /uploads
router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ✅ Multer config for local image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.params.id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPEG and PNG images are allowed"));
  },
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
      image: user.image,
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

// ✅ PUT /:id (update image via URL)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const updatedUser = await Users.findByIdAndUpdate(
      id,
      { image },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Updated profile image for user:", updatedUser._id);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("❌ Error updating profile image:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ POST /:id/upload (upload image file)
router.post("/:id/upload", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    const updatedUser = await Users.findByIdAndUpdate(
      id,
      { image: imagePath },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Image uploaded for user:", updatedUser._id);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
