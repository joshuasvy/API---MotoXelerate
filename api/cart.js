import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const router = express.Router();

// 🛒 Create or update cart (with full product details)
router.post("/", async (req, res) => {
  console.log("📥 Incoming cart payload:", req.body);
  const { userId, product } = req.body;

  if (!userId || !product) {
    console.log("⚠️ Missing userId or product");
    return res.status(400).json({ error: "Missing userId or product." });
  }

  try {
    const productDoc = await Product.findById(product);
    console.log("🧪 Product fetched:", productDoc);

    if (!productDoc) {
      console.log("❌ Product not found");
      return res.status(404).json({ error: "Product not found." });
    }

    // ✅ Defensive check for required fields
    const requiredFields = ["productName", "price", "image", "category"];
    for (const field of requiredFields) {
      if (productDoc[field] === undefined || productDoc[field] === null) {
        console.log(`❌ Missing field in product: ${field}`);
        return res.status(400).json({
          error: `Product is missing required field: ${field}`,
        });
      }
    }

    let cart = await Cart.findOne({ userId });
    console.log("🧪 Existing cart:", cart);

    const newItem = {
      product: productDoc._id,
      productName: productDoc.productName,
      image: productDoc.image,
      price: productDoc.price,
      quantity: 1,
      category: productDoc.category,
      specification: productDoc.specification || "",
      selected: false,
    };

    console.log("🧪 Item to push:", newItem);

    if (!cart) {
      cart = new Cart({
        userId,
        items: [newItem],
      });
      console.log("🆕 New cart created");
    } else {
      // 🧹 Clean up legacy items missing required fields
      cart.items = cart.items.filter((item) => {
        const isValid =
          item.productName &&
          item.price !== undefined &&
          item.image &&
          item.category;
        if (!isValid) {
          console.log("🧹 Removing invalid item:", item);
        }
        return isValid;
      });

      const existingItem = cart.items.find(
        (item) => item.product.toString() === productDoc._id.toString()
      );

      console.log("🧪 Existing item match:", existingItem);

      if (existingItem) {
        existingItem.quantity += 1;
        console.log("🔁 Incremented quantity for existing item");
      } else {
        cart.items.push({ ...newItem });
        console.log("➕ Pushed new item to cart");
      }
    }

    console.log(
      "🧪 Final cart before save:",
      JSON.stringify(cart.items, null, 2)
    );

    const saved = await cart.save();
    const populated = await Cart.findById(saved._id)
      .populate("userId", "firstName lastName")
      .exec();

    console.log("✅ Cart saved and populated:", populated);
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Error creating/updating cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update cart by ID (e.g. toggle selected, change quantity)
router.put("/:id", async (req, res) => {
  try {
    const updated = await Cart.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("userId", "firstName lastName");

    if (!updated) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating cart:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🧹 Remove item from cart
router.put("/:id/remove", async (req, res) => {
  console.log("🛠️ /:id/remove route hit:", req.params.id, req.body.productId);
  const { productId } = req.body;

  try {
    const cart = await Cart.findById(req.params.id);
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    const updated = await Cart.findById(req.params.id).populate(
      "userId",
      "firstName lastName"
    );

    res.json(updated);
  } catch (err) {
    console.error("❌ Error removing item from cart:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🗑 Delete entire cart by ID
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

// 📦 Get cart by userId
router.get("/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId })
      .populate("items.product")
      .populate("userId", "firstName lastName");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json(cart);
  } catch (err) {
    console.error("❌ Error fetching cart:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
