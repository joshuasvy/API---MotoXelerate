import express from "express";
import Cart from "../models/Cart.js";

const router = express.Router();

// 🛒 Create or update cart
router.post("/", async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, quantity }],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity || 1;
      } else {
        cart.items.push({ productId, quantity });
      }
    }

    const saved = await cart.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating/updating cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update cart by ID
router.put("/:id", async (req, res) => {
  try {
    const updated = await Cart.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Cart not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Cart.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Cart not found" });
    }
    res.json({ message: "Cart deleted successfully", cart: deleted });
  } catch (err) {
    console.error("Error deleting cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📦 Get all carts
router.get("/", async (req, res) => {
  try {
    const carts = await Cart.find()
      .populate("userId", "name") // ✅ This pulls the username from Users
      .populate("items.productId"); // ✅ This pulls full product details

    res.json(carts);
  } catch (err) {
    console.error("Error fetching carts:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
