import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./api/user.js"; // ✅ Modular route import

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Connected!");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// Routes
app.use("/api/user", userRoutes); // ✅ Mount route path (singular)
app.use("/api/users", userRoutes); // also mount plural so /api/users and /api/user both work

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route Not Found" });
});

// Server
const PORT = process.env.PORT || 2004;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
