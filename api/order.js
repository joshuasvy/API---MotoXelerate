import express from "express";
import Orders from "../models/Orders.js";
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
          .json({ error: `Product not found: ${item.productId}` });
      }

      // 🧹 Defensive check for required fields
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
        status: "Processing",
      });
    }

    if (orderItems.length === 0) {
      console.log("❌ No valid items to place in order");
      return res
        .status(400)
        .json({ error: "No valid items to place in order." });
    }

    const newOrder = new Orders({
      userId,
      customerName: `${user.firstName} ${user.lastName}`,
      items: orderItems,
      totalOrder,
      paymentMethod,
      orderRequest: "For Approval",
      deliveryAddress,
      notes,
    });

    console.log("📦 Order to save:", JSON.stringify(newOrder, null, 2));

    const savedOrder = await newOrder.save();
    console.log("✅ Order saved:", savedOrder._id);

    // 🧹 Remove only the ordered items from the cart
    const cartUpdate = await Cart.findOneAndUpdate(
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

    console.log("🧹 Cart updated after checkout:", cartUpdate);

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("❌ Error during checkout:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📦 Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Orders.find().sort({ createdAt: -1 });
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
    const orders = await Orders.find({ userId })
      .sort({ createdAt: -1 })
      .populate("items.product");

    const formatted = orders.map((order) => ({
      orderId: order._id,
      customerName: order.customerName,
      orderDate: order.createdAt,
      totalOrder: order.totalOrder,
      paymentMethod: order.paymentMethod,
      items: order.items.map((item) => ({
        productName: item.product?.productName || "Unnamed Product",
        specification: item.product?.specification || "No specification",
        price: item.product?.price || 0,
        image: item.product?.image || "",
        quantity: item.quantity,
        status: item.status,
      })),
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch user orders", error: err.message });
  }
});

// 📦 Get order by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Orders.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (err) {
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
    const order = await Orders.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.items.forEach((item) => {
      const updatedItem = items.find(
        (i) => i.productId.toString() === item.productId.toString()
      );
      if (updatedItem) {
        item.status = updatedItem.status;
      }
    });

    const updated = await order.save();
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
