// scripts/fixCancelledOrders.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Orders.js"; // adjust path to your Order model

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("🔍 Starting cancelled orders fix...");

  // Find orders where items are Cancelled but order.status is not Cancelled
  const badOrders = await Order.find({
    "items.status": "Cancelled",
    status: { $ne: "Cancelled" },
  });

  console.log(`Found ${badOrders.length} orders with mismatch`);

  for (const order of badOrders) {
    const prevStatus = order.status;

    // Update order status
    order.status = "Cancelled";
    order.cancellationStatus = order.cancellationStatus || "Accepted";
    order.cancelledAt = order.cancelledAt || new Date();

    // Normalize all items to Cancelled
    order.items = order.items.map((item) => {
      const plain =
        typeof item.toObject === "function" ? item.toObject() : item;
      return { ...plain, status: "Cancelled" };
    });

    await order.save();

    console.log("✅ Fixed order:", {
      orderId: order._id.toString(),
      prevStatus,
      newStatus: order.status,
    });
  }

  console.log("🎉 Finished fixing cancelled orders");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Error running fix script:", err);
  process.exit(1);
});
