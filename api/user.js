import express from "express";
import Users from "../models/Users.js";

const router = express.Router();

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

router.get("/all", async (req, res) => {
  try {
    const users = await Users.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
