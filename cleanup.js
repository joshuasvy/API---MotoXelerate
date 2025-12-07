import dotenv from "dotenv";
import mongoose from "mongoose";
import Order from "./models/Orders.js";
import User from "./models/Users.js";

dotenv.config();

async function backfillOrders() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("🔍 Fetching orders without email/phone...");
  const orders = await Order.find({
    $or: [
      { customerEmail: { $exists: false } },
      { customerPhone: { $exists: false } },
    ],
  });

  console.log(`Found ${orders.length} orders to update`);

  for (const order of orders) {
    try {
      const user = await User.findById(order.userId);
      if (!user) {
        console.warn(`⚠️ No user found for order ${order._id}`);
        continue;
      }

      order.customerEmail = user.email;
      order.customerPhone = user.contact;

      await order.save();
      console.log(`✅ Updated order ${order._id} with email/phone`);
    } catch (err) {
      console.error(`❌ Failed to update order ${order._id}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log("🎉 Backfill complete!");
}

backfillOrders();
