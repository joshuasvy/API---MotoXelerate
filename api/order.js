import { broadcastEntity } from "../utils/socketBroadcast.js";
import { authToken } from "../middleware/authToken.js";
import mongoose from "mongoose";
import express from "express";
import Order from "../models/Orders.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Users from "../models/Users.js";
import StockLog from "../models/StockLog.js";
import Invoice from "../models/Invoice.js";
import NotificationLog from "../models/NotificationLog.js";

const router = express.Router();

// 🛒 Create a new order
router.post("/", async (req, res) => {
  const {
    userId,
    selectedItems,
    totalOrder,
    paymentMethod,
    deliveryAddress,
    notes,
    payment,
  } = req.body;

  if (!userId || !Array.isArray(selectedItems) || selectedItems.length === 0) {
    return res.status(400).json({ error: "Missing or invalid checkout data." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Normalize userId once using createFromHexString
    const userObjectId = mongoose.Types.ObjectId.createFromHexString(userId);

    const user = await Users.findById(userObjectId).session(session);
    if (!user) throw new Error(`User not found: ${userId}`);

    const orderItems = [];
    const invoiceItems = [];
    const stockLogs = [];

    for (const item of selectedItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Invalid product ID: ${item.product}`);

      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.productName}. Available: ${product.stock}, Requested: ${item.quantity}`
        );
      }

      product.stock -= item.quantity;
      await product.save({ session });

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        status: "For Approval",
      });

      invoiceItems.push({
        description: product.productName,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal: product.price * item.quantity,
      });

      stockLogs.push({
        productId: product._id,
        change: -Math.abs(item.quantity),
        reason: "Order",
      });
    }

    const normalizedPaymentMethod =
      paymentMethod?.toLowerCase() === "gcash" ? "GCash" : paymentMethod;

    const newOrder = new Order({
      userId: userObjectId,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      customerPhone: user.contact,
      items: orderItems,
      totalOrder,
      paymentMethod: normalizedPaymentMethod,
      deliveryAddress: deliveryAddress || user.address,
      notes,
      payment: {
        referenceId: payment?.referenceId,
        chargeId: payment?.chargeId,
        amount: payment?.amount || totalOrder,
        status: payment?.status || "Pending",
        paidAt: null,
        method: payment?.method || "GCash",
      },
    });

    const savedOrder = await newOrder.save({ session });

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(
      Math.random() * 10000
    )}`;

    const newInvoice = new Invoice({
      user: userObjectId,
      invoiceNumber,
      sourceType: "Order",
      sourceId: savedOrder._id,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      customerPhone: user.contact,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: payment?.status || "Pending",
      referenceId: payment?.referenceId,
      items: invoiceItems,
      subtotal: totalOrder,
      total: totalOrder,
      status: "Unpaid",
    });

    await newInvoice.save({ session });

    if (stockLogs.length > 0) {
      const createdLogs = await StockLog.insertMany(
        stockLogs.map((log) => ({ ...log, orderId: savedOrder._id })),
        { session }
      );
      console.log(`📒 Stock logs created for order ${savedOrder._id}`);

      createdLogs.forEach((log) => {
        broadcastEntity("stocklog", log.toObject(), "update");
      });
    }

    const updatedCart = await Cart.findOneAndUpdate(
      { userId: userObjectId },
      {
        $pull: {
          items: {
            product: { $in: selectedItems.map((item) => item.product) },
          },
        },
      },
      { new: true, session }
    );
    console.log("🛒 Cart updated for user:", userId);

    const confirmed = await Order.findById(savedOrder._id)
      .session(session)
      .populate({
        path: "items.product",
        model: "Product",
        select: "productName specification price image",
        strictPopulate: false,
      });

    // ✅ Create NotificationLog entry inside transaction
    const notif = new NotificationLog({
      userId: userObjectId,
      orderId: confirmed._id,
      type: "order",
      customerName: confirmed.customerName,
      message: `New order from ${confirmed.customerName}`,
    });
    await notif.save({ session });
    console.log("📒 NotificationLog created:", notif._id);

    // ✅ Commit transaction
    await session.commitTransaction();
    await session.endSession();
    console.log("✅ Transaction committed for order:", savedOrder._id);

    // ✅ Broadcast AFTER commit
    broadcastEntity("order", confirmed.toObject(), "update");
    broadcastEntity("invoice", newInvoice.toObject(), "update");
    if (updatedCart) broadcastEntity("cart", updatedCart.toObject(), "update");

    broadcastEntity(
      "notification",
      {
        _id: notif._id.toString(),
        orderId: confirmed._id.toString(),
        customerName: confirmed.customerName,
        type: "order",
        message: notif.message,
        createdAt: notif.createdAt,
      },
      "create"
    );

    return res
      .status(201)
      .json({ order: confirmed, invoice: newInvoice, notification: notif });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    await session.endSession();
    console.error("❌ Error during checkout:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", authToken, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate({
      path: "items.product",
      model: "Product",
      select: "productName specification price image",
      strictPopulate: false,
    });

    // if (!orders || orders.length === 0) {
    //   console.warn("⚠️ No orders found in database");
    //   return res.status(200).json([]);
    // }

    const formattedOrders = orders.map((order) => {
      const formattedItems = (order.items || []).map((item) => ({
        productId: item.product?._id,
        productName: item.product?.productName,
        specification: item.product?.specification,
        price: item.product?.price,
        image: item.product?.image,
        quantity: item.quantity,
        status: item.status,
        read: item.read === false ? false : true,
      }));

      return {
        _id: order._id,
        orderId: order._id.toString(),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        orderDate: order.createdAt,
        totalOrder: order.totalOrder,
        paymentStatus: order.payment?.status ?? "N/A",
        paidAt: order.payment?.paidAt ?? null,
        deliveryAddress: order.deliveryAddress || "No address provided",
        notes: order.notes || "",
        items: formattedItems,
      };
    });

    console.log("✅ Returning all orders:", formattedOrders.length);
    res.status(200).json(formattedOrders);
  } catch (err) {
    console.error("❌ Failed to fetch all orders:", err.message);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
});

// 📦 Get orders by user
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn("⚠️ Invalid userId:", userId);
    return res.status(400).json({ error: "Invalid user ID." });
  }

  try {
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "items.product",
        model: "Product",
        select: "productName specification price image",
        strictPopulate: false,
      });

    if (!orders || orders.length === 0) {
      console.warn("⚠️ No orders found for user:", userId);
      return res.status(200).json([]);
    }

    const formattedOrders = orders.map((order) => {
      const formattedItems = (order.items || [])
        .map((item, itemIndex) => {
          const product = item.product;
          if (!product || typeof product !== "object" || !product._id) {
            console.warn(
              `⚠️ Order ${order._id} item[${itemIndex}] missing product`,
              item
            );
            return null;
          }

          return {
            productId: product._id,
            productName: product.productName,
            specification: product.specification,
            price: product.price,
            image: product.image,
            quantity: item.quantity,
            status: item.status,
            read: item.read === false ? false : true,
          };
        })
        .filter(Boolean);

      return {
        _id: order._id, // ✅ MongoDB ObjectId
        orderId: order._id.toString(), // ✅ optional alias if you want to keep using "orderId"
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        orderDate: order.createdAt,
        totalOrder: order.totalOrder,
        paymentStatus: order.payment?.status ?? "N/A",
        paidAt: order.payment?.paidAt ?? null,
        deliveryAddress: order.deliveryAddress || "No address provided",
        notes: order.notes || "",
        items: formattedItems,
      };
    });

    console.log("🧾 Final formattedOrders:", formattedOrders);
    res.status(200).json(formattedOrders);
  } catch (err) {
    console.error("❌ Failed to fetch orders:", err.message);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
});

// 📦 Get order by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid order ID" });
  }

  try {
    const order = await Order.findById(id).populate("items.product").lean(); // ✅ plain object with all fields

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order); // ✅ send everything
  } catch (err) {
    console.error("❌ Error fetching order by ID:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/reference/:referenceId", async (req, res) => {
  const { referenceId } = req.params;

  if (!referenceId) {
    console.warn("⚠️ Missing referenceId in request");
    return res.status(400).json({ error: "Missing referenceId" });
  }

  try {
    const order = await Order.findOne({ "payment.referenceId": referenceId });

    if (!order) {
      console.warn("⚠️ No order found for referenceId:", referenceId);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("📦 Found order for polling:", {
      referenceId,
      status: order.payment?.status,
    });

    res.json(order);
  } catch (err) {
    console.error("❌ Error fetching order by referenceId:", err.message);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// 🔄 Update item status in an order
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ message: "Invalid items payload" });
  }

  try {
    const order = await Order.findById(id).populate("items.product");
    if (!order) {
      console.warn(`❌ Order not found for ID: ${id}`);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("🔄 Incoming update payload:", items);

    for (let index = 0; index < order.items.length; index++) {
      const item = order.items[index];

      const productId =
        typeof item.product === "object" && item.product?._id
          ? item.product._id.toString()
          : item.product?.toString();

      const updatedItem = items.find(
        (i) => i.productId.toString() === productId
      );

      if (updatedItem) {
        item.status = updatedItem.status;

        // 🔔 Log status update as unread notification
        await NotificationLog.updateOne(
          { userId: order.userId, orderId: order._id },
          {
            $set: {
              status: updatedItem.status,
              readAt: null,
            },
          },
          { upsert: true }
        );

        console.log(
          `🔔 Logged status "${updatedItem.status}" for order ${order._id}, item[${index}]`
        );
      }
    }

    // ✅ Update main orderRequest status if all items are completed
    const allCompleted = order.items.every(
      (item) => item.status === "Completed"
    );
    if (allCompleted) {
      order.orderRequest = "Completed";
    } else {
      order.orderRequest = "For Approval"; // or keep other logic if needed
    }

    const updated = await order.save();
    console.log(`✅ Order ${order._id} updated successfully`);
    res.status(200).json(updated);
  } catch (err) {
    console.error("❌ Error updating order status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update payment status route
router.put("/:id/payment-status", async (req, res) => {
  try {
    const { status } = req.body;

    // Validate allowed statuses
    if (!["Pending", "Succeeded", "Failed"].includes(status)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }

    console.log("🔄 Updating payment status:", req.params.id, "→", status);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        "payment.status": status,
        "payment.paidAt": status === "Succeeded" ? new Date() : null,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    console.error("❌ Error updating payment status:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/request-cancel", authToken, async (req, res) => {
  const { id: orderId } = req.params;
  const { reason } = req.body;

  try {
    console.log("🛠 Request-cancel route triggered");
    console.log("➡️ orderId:", orderId);
    console.log("➡️ reason:", reason);

    if (!reason || typeof reason !== "string") {
      console.warn("⚠️ Missing or invalid cancellation reason");
      return res.status(400).json({ error: "Cancellation reason is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.warn(`⚠️ No order found with _id=${orderId}`);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("✅ Order found:", {
      _id: order._id.toString(),
      customerName: order.customerName,
      currentCancellationStatus: order.cancellationStatus,
    });

    order.cancellationStatus = "Requested";
    order.cancellationReason = reason;
    await order.save();

    console.log("📦 Order updated:", {
      _id: order._id.toString(),
      cancellationStatus: order.cancellationStatus,
      cancellationReason: order.cancellationReason,
    });

    await NotificationLog.create({
      userId: order.userId,
      type: "CancellationRequest",
      orderId: order._id,
      message: `Cancellation requested by ${order.customerName}`,
      reason,
      createdAt: new Date(),
      readAt: null,
    });

    console.log("📝 NotificationLog entry created for cancellation request");

    broadcastEntity(
      "notification",
      {
        type: "CancellationRequest",
        orderId: order._id.toString(),
        customerName: order.customerName,
        reason: order.cancellationReason,
      },
      "create"
    );

    console.log("📡 Broadcasted cancellation request notification");

    res.json({ message: "Cancellation requested", order });
  } catch (err) {
    console.error("❌ Error in request-cancel route:", err.message);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
});

router.put("/:id/accept-cancel", authToken, async (req, res) => {
  try {
    const orderId = req.params.id;

    console.log("🛠 AcceptCancel route triggered");
    console.log("Received orderId param:", orderId);

    const order = await Order.findById(orderId);
    if (!order) {
      console.warn(`⚠️ No order found with _id=${orderId}`);
      return res.status(404).json({ error: "Order not found" });
    }

    // Only allow acceptance if cancellation was requested
    if (order.cancellationStatus !== "Requested") {
      console.warn(
        `⚠️ Order ${orderId} cancellationStatus is "${order.cancellationStatus}", not "Requested"`
      );
      return res.status(400).json({
        error: "Cancellation must be requested before it can be accepted",
      });
    }

    // Update cancellation fields
    order.cancellationStatus = "Accepted";
    order.cancelledAt = new Date();

    // Update all item statuses to Cancelled
    order.items = order.items.map((item) => {
      item.status = "Cancelled";
      return item;
    });

    await order.save();

    console.log("✅ Cancellation accepted:", {
      _id: order._id.toString(),
      cancellationStatus: order.cancellationStatus,
      cancellationReason: order.cancellationReason,
      cancelledAt: order.cancelledAt,
      itemStatuses: order.items.map((i) => i.status),
    });

    broadcastEntity(
      "notification",
      {
        type: "CancellationAccepted",
        orderId: order._id.toString(),
        customerName: order.customerName,
        message: `Cancellation accepted for ${order.customerName}`,
      },
      "create"
    );

    console.log("📡 Broadcasted order + notification update");

    res.json({ message: "Cancellation accepted, order cancelled", order });
  } catch (err) {
    console.error("❌ Error accepting cancellation:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderRequest = req.body.status;
    await order.save();

    // ✅ Broadcast using helper
    broadcastEntity("order", order, "update");

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order marked as read", order });
  } catch (err) {
    res.status(500).json({ message: "Error updating order", error: err });
  }
});

export default router;
