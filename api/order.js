import express from "express";
import Order from "../models/Orders.js"; // ✅ Singular model name
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Users from "../models/Users.js";

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
  } = req.body;

  if (
    !userId ||
    !selectedItems ||
    !Array.isArray(selectedItems) ||
    selectedItems.length === 0
  ) {
    console.log("⚠️ Missing or invalid checkout data");
    return res.status(400).json({ error: "Missing or invalid checkout data." });
  }

  try {
    const user = await Users.findById(userId);
    if (!user) {
      console.log("❌ User not found:", userId);
      return res.status(404).json({ error: "User not found." });
    }

    const orderItems = [];

    for (const item of selectedItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        console.log("❌ Product not found:", item.product);
        return res
          .status(404)
          .json({ error: `Product not found: ${item.product}` });
      }

      const requiredFields = ["productName", "price", "image", "category"];
      const missing = requiredFields.filter(
        (field) => product[field] === undefined || product[field] === null
      );
      if (missing.length > 0) {
        console.log(
          `❌ Product missing fields: ${missing.join(", ")}`,
          product
        );
        return res.status(400).json({
          error: `Product ${
            product._id
          } is missing required fields: ${missing.join(", ")}`,
        });
      }

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        status: "For Approval",
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
    });

    const savedOrder = await newOrder.save();
    console.log("✅ Order saved:", savedOrder._id);

    await Cart.findOneAndUpdate(
      { userId },
      {
        $pull: {
          items: {
            product: { $in: selectedItems.map((item) => item.product) },
          },
        },
      },
      { new: true }
    );

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("❌ Error during checkout:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📦 Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: err.message });
  }
});

// 📦 Get orders by user
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .populate("items.product");

    const formattedOrders = orders.map((order) => ({
      orderId: order._id,
      customerName: order.customerName,
      orderDate: order.createdAt,
      totalOrder: order.totalOrder,
      paymentMethod: order.paymentMethod,
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
      paymentMethod: order.paymentMethod,
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

    res.status(200).json(formatted);
  } catch (err) {
    console.error("❌ Error fetching order by ID:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
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
