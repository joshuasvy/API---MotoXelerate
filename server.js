import { Server } from "socket.io";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import userRoutes from "./api/user.js";
import appointmentRoutes from "./api/appointment.js";
import adminRoutes from "./api/admin.js";
import productRoutes from "./api/product.js";
import cartRoutes from "./api/cart.js";
import orderRoutes from "./api/order.js";
import announcementRoute from "./api/announcement.js";
import reviewRoute from "./api/review.js";
import notificationRoute from "./api/notification.js";
import xenditGcashRoutes from "./api/xenditGcash.js";
import xenditWebhooks from "./api/xenditWebhooks.js";
import redirectRoutes from "./redirects/redirect.js";
import mockWebhook from "./api/mockWebhook.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

// ✅ Socket.IO instance
const io = new Server(server, { cors: { origin: "*" } });

// ✅ Connection handler
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("disconnect", (reason) => {
    console.log(`⚠️ Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Appointment events
  socket.on("appointment:new", (data) => {
    console.log("📥 appointment:new received:", data);
    io.emit("appointment:update", data);
  });

  // Order events
  socket.on("order:new", (data) => {
    console.log("📥 order:new received:", data);
    io.emit("order:update", data);
  });

  // Catch-all for unexpected events
  socket.onAny((event, ...args) => {
    console.log(`🔎 Unhandled socket event: ${event}`, args);
  });
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Root route
app.get("/", (req, res) => {
  res.send("Connected!");
});

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// ✅ API routes
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/product", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/announcement", announcementRoute);
app.use("/api/review", reviewRoute);
app.use("/api/notification", notificationRoute);
app.use("/api/gcash", xenditGcashRoutes);
app.use("/api/webhooks", xenditWebhooks);
app.use("/api/redirect", redirectRoutes);
app.use("/api/gcash/webhook", mockWebhook);

// ✅ 404 handler
app.use((req, res) => {
  console.log("❌ 404 hit:", req.method, req.originalUrl);
  res.status(404).json({ message: "Route Not Found" });
});

// ✅ Server start
const PORT = process.env.PORT || 2004;
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
});

// ✅ Export for use in routes
export { app, io };
