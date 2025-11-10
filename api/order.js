import mongoose from "mongoose";
import express from "express";
import Order from "../models/Orders.js"; // ✅ Singular model name
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Users from "../models/Users.js";
import StockLog from "../models/StockLog.js";

const router = express.Router();

// 🛒 Create a new order
router.post("/", async (req, res) => {
  console.log("🧪 Incoming payload:", req.body);

  const {
    userId,
    selectedItems,
    totalOrder,
    paymentMethod,
    deliveryAddress,
    notes,
    referenceId,
    chargeId,
    paidAmount,
  } = req.body;

  if (
    !userId ||
    !selectedItems ||
    !Array.isArray(selectedItems) ||
    selectedItems.length === 0
  ) {
    console.warn("⚠️ Missing or invalid checkout data");
    return res.status(400).json({ error: "Missing or invalid checkout data." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await Users.findById(userId).session(session);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const orderItems = [];

    for (const item of selectedItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      const requiredFields = ["productName", "price", "image", "category"];
      const missing = requiredFields.filter(
        (field) => product[field] === undefined || product[field] === null
      );
      if (missing.length > 0) {
        throw new Error(
          `Product ${product._id} is missing fields: ${missing.join(", ")}`
        );
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.productName}`);
      }

      // ✅ Atomic stock decrement
      product.stock -= item.quantity;
      await product.save({ session });

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        status: "For approval",
      });
    }

    const newOrder = new Order({
      userId,
      customerName: `${user.firstName} ${user.lastName}`,
      items: orderItems,
      totalOrder,
      paymentMethod,
      orderRequest: "For Approval",
      deliveryAddress: deliveryAddress || user.address,
      notes,
      payment:
        paymentMethod === "Gcash"
          ? {
              referenceId,
              chargeId,
              amount: paidAmount || totalOrder,
              status: "Pending",
              paidAt: null,
            }
          : undefined,
    });

    const savedOrder = await newOrder.save({ session });
    console.log("✅ Order saved:", savedOrder._id);

    // ✅ Now that savedOrder exists, log stock changes
    for (const item of selectedItems) {
      try {
        await StockLog.create(
          {
            productId: item.product,
            orderId: savedOrder._id,
            change: -item.quantity,
            reason: "Order",
          },
          { session }
        );
      } catch (logErr) {
        console.warn("⚠️ Failed to log stock change:", logErr.message);
      }
    }

    await Cart.findOneAndUpdate(
      { userId },
      {
        $pull: {
          items: {
            product: { $in: selectedItems.map((item) => item.product) },
          },
        },
      },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(savedOrder);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Error during checkout:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📦 Get all orders or filter by userId and status
router.get("/", async (req, res) => {
  const { userId, status } = req.query;

  const filter = {};
  if (userId) filter.user = userId;
  if (status) filter.status = status.toLowerCase();

  try {
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch orders",
      error: err.message,
    });
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

    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      customerName: order.customerName,
      orderDate: order.createdAt,
      totalOrder: order.totalOrder,
      paymentStatus: order.payment?.status ?? "N/A", // ✅ Explicit status
      paidAt: order.payment?.paidAt ?? null,
      deliveryAddress: order.deliveryAddress || "No address provided",
      notes: order.notes || "",
      items: order.items
        .map((item, index) => {
          const product = item.product;
          if (!product || typeof product !== "object" || !product._id) {
            console.warn(
              `⚠️ Order ${order._id} item[${index}] missing product`
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
          };
        })
        .filter(Boolean),
    }));

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

  try {
    const order = await Order.findById(id).populate("items.product");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const formatted = {
      orderId: order._id,
      customerName: order.customerName,
      orderDate: order.createdAt,
      totalOrder: order.totalOrder,
      paymentMethod: order.paymentMethod ?? "N/A",
      paymentStatus:
        order.payment &&
        typeof order.payment === "object" &&
        "status" in order.payment
          ? order.payment.status
          : "Missing payment status",
      paidAt: order.payment?.paidAt ?? null,
      deliveryAddress: order.deliveryAddress || "No address provided",
      notes: order.notes || "",
      items: order.items.map((item, index) => {
        const product = item.product;
        const isMissing =
          !product || typeof product !== "object" || !product._id;

        if (isMissing) {
          console.warn(
            `⚠️ Order ${order._id} item[${index}] missing product:`,
            item
          );
        }

        return {
          productId: product?._id ?? `missing-${index}`,
          productName: product?.productName ?? null,
          specification: product?.specification ?? null,
          price: product?.price ?? null,
          image: product?.image ?? null,
          quantity: item.quantity,
          status: item.status,
        };
      }),
    };
    console.log("✅ Sending formatted order:", formatted);
    console.log("🧾 Final formatted order:", {
      payment: order.payment,
      paymentStatus: order.payment?.status,
      paymentMethod: order.paymentMethod,
    });

    res.status(200).json({
      ...formatted,
      payment: order.payment,
    });
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
    if (!order) return res.status(404).json({ message: "Order not found" });

    console.log("🔄 Incoming update payload:", items);
    console.log("📦 Existing order items:", order.items);

    order.items.forEach((item, index) => {
      const productId =
        typeof item.product === "object" && item.product?._id
          ? item.product._id.toString()
          : item.product?.toString();

      const updatedItem = items.find(
        (i) => i.productId.toString() === productId
      );

      if (updatedItem) {
        item.status = updatedItem.status;
      } else {
        console.warn(
          `⚠️ No match for item[${index}] with productId:`,
          productId
        );
      }
    });

    const updated = await order.save();
    res.status(200).json(updated);
  } catch (err) {
    console.error("❌ Error updating order status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
