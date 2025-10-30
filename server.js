import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./api/user.js";
import appointmentRoutes from "./api/appointment.js";
import adminRoutes from "./api/admin.js";
import productRoutes from "./api/product.js";
import cartRoutes from "./api/cart.js";
import orderRoutes from "./api/order.js";
import xenditGcashRoutes from "./api/xenditGcash.js";

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
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/product", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/gcash", xenditGcashRoutes);
// 404 handler
app.use((req, res) => {
  console.log("❌ 404 hit:", req.method, req.originalUrl);
  res.status(404).json({ message: "Route Not Found" });
});

// Server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
