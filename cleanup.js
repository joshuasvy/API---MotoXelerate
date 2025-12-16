import mongoose from "mongoose";
import Order from "./models/Orders.js";
import NotificationLog from "./models/NotificationLog.js";
import Product from "./models/Product.js";
import dotenv from "dotenv";

dotenv.config();

async function syncNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("🔗 Connected to MongoDB");

    // Find all notifications missing enriched fields
    const notifications = await NotificationLog.find({
      type: {
        $in: [
          "CancellationRequest",
          "CancellationAccepted",
          "CancellationRejected",
        ],
      },
    });

    console.log(`📦 Found ${notifications.length} notifications to check`);

    for (const notif of notifications) {
      if (!notif.orderId) continue;

      const order = await Order.findById(notif.orderId).populate({
        path: "items.product",
        select: "productName specification price image",
      });

      if (!order) {
        console.warn(`⚠️ No order found for notification ${notif._id}`);
        continue;
      }

      // Update notification with missing fields
      notif.customerEmail = order.customerEmail;
      notif.customerPhone = order.customerPhone;
      notif.deliveryAddress = order.deliveryAddress;
      notif.paymentMethod = order.paymentMethod;
      notif.totalOrder = order.totalOrder;
      notif.notes = order.notes;
      notif.items = order.items;
      notif.payment = {
        cancellationStatus: order.cancellationStatus,
        cancellationReason: order.cancellationReason,
        cancelledAt: order.cancelledAt ?? null,
      };

      await notif.save();
      console.log(
        `✅ Updated notification ${notif._id} with enriched order data`
      );
    }

    console.log("🎉 Sync complete");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error syncing notifications:", err.message);
    process.exit(1);
  }
}

syncNotifications();
