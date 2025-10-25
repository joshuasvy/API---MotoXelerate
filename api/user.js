import express from "express";
import Users from "../models/Users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Register Crud
router.post("/register", async (req, res) => {
  console.log("📥 Received from frontend:", req.body);
  try {
    const { name, contact, email, password } = req.body;

    if (!name || !contact || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const newUser = new Users({ name, contact, email, password });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
    console.log("Incoming data:", req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Crud
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Users.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful", token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetching all users
router.get("/all", async (req, res) => {
  try {
    const users = await Users.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
