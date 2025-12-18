import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
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
import invoiceRoutes from "./api/invoice.js";
import mockWebhook from "./api/mockWebhook.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://api-motoxcelerate.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("disconnect", (reason) => {
    console.log(`⚠️ Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.onAny((event, ...args) => {
    console.log(`🔎 Socket event: ${event}`, args);
  });

  socket.on("error", (err) => {
    console.error("❌ Socket error:", err);
  });
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://motoxcelerate.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control", // ✅ add this
      "X-Requested-With", // optional, often used
    ],
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (req, res) => res.send("OK"));
app.get("/", (req, res) => res.send("Connected!"));

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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
app.use("/api/invoice", invoiceRoutes);
app.use("/api/gcash/webhook", mockWebhook);

app.use((req, res) => {
  console.warn("❌ 404 hit:", req.method, req.originalUrl);
  res.status(404).json({ message: "Route Not Found" });
});

const PORT = process.env.PORT || 2004;
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
});

export { app, io };
