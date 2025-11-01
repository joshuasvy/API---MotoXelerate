import mongoose from "mongoose";
import Orders from "../models/Orders.js"; // adjust path if needed
import dotenv from "dotenv";

dotenv.config(); // if you're using .env for DB connection

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateLegacyOrders() {
  const orders = await Orders.find();

  for (const order of orders) {
    let updated = false;

    for (const item of order.items) {
      if (typeof item.product === "string") {
        item.product = mongoose.Types.ObjectId(item.product);
        updated = true;
      }

      delete item.productName;
      delete item.price;
      delete item.image;
      delete item.specification;
      delete item.category;
    }

    if (updated) {
      await order.save();
      console.log("✅ Migrated order:", order._id);
    }
  }

  console.log("🎉 Legacy migration complete.");
  mongoose.disconnect();
}

migrateLegacyOrders().catch((err) => {
  console.error("❌ Migration error:", err);
  mongoose.disconnect();
});
