import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Orders.js";

dotenv.config(); // ✅ Load your .env file

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async () => {
  try {
    const orders = await Order.find();
    for (const order of orders) {
      const validItems = order.items.filter((item) => item.product);
      if (validItems.length !== order.items.length) {
        order.items = validItems;
        await order.save();
        console.log(`✅ Cleaned order ${order._id}`);
      }
    }

    console.log("🎉 Cleanup complete");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  }
})();
