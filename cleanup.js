import mongoose from "mongoose";
import Order from "./models/Orders.js"; // adjust path as needed
import Product from "./models/Product.js";

async function cleanLegacyOrders() {
  const MONGO_URI =
    "mongodb+srv://joshuapaulcortez_db_user:motoxelerate@motoxeleratecluster.kzhtuvj.mongodb.net/motoXelerate";

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log("✅ Connected to MongoDB");

  await mongoose.connection.db.admin().ping();
  console.log("✅ MongoDB ping successful");

  try {
    const orders = await Order.find().populate("items.product");

    const brokenOrders = [];

    for (const order of orders) {
      const brokenItems = order.items.filter(
        (item) =>
          !item.product || typeof item.product !== "object" || !item.product._id
      );

      if (brokenItems.length > 0) {
        console.warn(
          `⚠️ Order ${order._id} has ${brokenItems.length} broken items`
        );
        brokenOrders.push({
          orderId: order._id,
          brokenCount: brokenItems.length,
          customerName: order.customerName,
          createdAt: order.createdAt,
        });

        // Optional: Remove broken items from the order
        order.items = order.items.filter(
          (item) => item.product && typeof item.product === "object"
        );

        await order.save();
        console.log(`✅ Cleaned Order ${order._id}`);
      }
    }

    console.log(`🧹 Cleanup complete. ${brokenOrders.length} orders cleaned.`);
    console.table(brokenOrders);
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
}

cleanLegacyOrders();
