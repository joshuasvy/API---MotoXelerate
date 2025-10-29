import express from "express";
import Cart from "../models/Cart.js";

const router = express.Router();

// 🛒 Create or update cart
router.post("/", async (req, res) => {
  console.log("📥 Incoming cart payload:", req.body);
  const { userId, productId, quantity } = req.body;

  try {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, quantity }],
      });
      console.log("🆕 New cart created");
    } else {
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity || 1;
        console.log("🔁 Updated quantity for existing item");
      } else {
        cart.items.push({ productId, quantity });
        console.log("➕ Added new item to cart");
      }
    }

    const saved = await cart.save();
    const populated = await Cart.findById(saved._id).populate(
      "items.productId"
    );
    res.status(201).json(populated); // ✅ return full cart to frontend
  } catch (err) {
    console.error("❌ Error creating/updating cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update cart by ID
router.put("/:id", async (req, res) => {
  try {
    const updated = await Cart.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("items.productId");

    if (!updated) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🗑 Delete cart by ID
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Cart.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Cart not found" });
    }
    res.json({ message: "Cart deleted successfully", cart: deleted });
  } catch (err) {
    console.error("❌ Error deleting cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📦 Get all carts
router.get("/", async (req, res) => {
  try {
    const carts = await Cart.find()
      .populate("userId", "name")
      .populate("items.productId");

    res.json(carts);
  } catch (err) {
    console.error("❌ Error fetching carts:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
