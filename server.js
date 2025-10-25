import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./controllers/user.js"; // ✅ Modular route import

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// Routes
app.use("/api/users", userRoutes); // ✅ Mount route path

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route Not Found" });
});

// Server
const PORT = process.env.PORT || 2004;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
