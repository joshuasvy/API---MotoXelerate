import express from "express";
import Orders from "../models/Orders.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Users from "../models/Users.js";

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("🧪 Incoming payload:", req.body);
  const { userId, selectedItems, total, payment } = req.body;

  if (
    !userId ||
    !selectedItems ||
    !Array.isArray(selectedItems) ||
    selectedItems.length === 0
  ) {
    return res.status(400).json({ error: "Missing or invalid checkout data." });
  }

  try {
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const orderItems = [];

    for (const item of selectedItems) {
      const product = await Product.findById(item._id);
      if (!product) {
        return res
          .status(404)
          .json({ error: `Product not found: ${item._id}` });
      }

      orderItems.push({
        productId: product._id,
        product_Name: product.product_Name,
        product_Price: product.product_Price,
        quantity: item.quantity,
        image: product.image,
        category: product.category,
        status: "Processing", // ✅ or whatever your default is
      });
    }

    console.log("🧾 Final order:", {
      userId,
      customerName: user.name,
      items: orderItems,
      total,
      payment,
    });

    const newOrder = new Orders({
      userId,
      customerName: user.name,
      items: orderItems,
      total,
      payment,
      status: "Processing",
    });

    const savedOrder = await newOrder.save();

    await Cart.findOneAndUpdate(
      { userId },
      {
        $pull: {
          items: {
            productId: { $in: selectedItems.map((item) => item._id) },
          },
        },
      }
    );

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("❌ Error during checkout:", err);
    res.status(500).json({ error: err.message });
  }
});

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

router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await Orders.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch user orders", error: err.message });
  }
});

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
