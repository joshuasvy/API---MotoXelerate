import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const router = express.Router();

// 🛒 Create or update cart (with full product details)
router.post("/", async (req, res) => {
  console.log("📥 Incoming cart payload:", req.body);
  const { userId, product } = req.body;

  if (!userId || !product) {
    console.warn("⚠️ Missing userId or product");
    return res.status(400).json({ error: "Missing userId or product." });
  }

  try {
    const productDoc = await Product.findById(product);
    console.log("🧪 Product fetched:", productDoc);

    if (!productDoc) {
      console.warn("❌ Product not found:", product);
      return res.status(404).json({ error: "Product not found." });
    }

    // ✅ Defensive check for required fields
    const requiredFields = ["productName", "price", "image", "category"];
    for (const field of requiredFields) {
      if (productDoc[field] === undefined || productDoc[field] === null) {
        console.warn(`❌ Missing field in product: ${field}`);
        return res.status(400).json({
          error: `Product is missing required field: ${field}`,
        });
      }
    }

    let cart = await Cart.findOne({ userId });
    console.log("🧪 Existing cart:", cart ? cart._id : "None");

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
      console.log("🆕 New cart created for user:", userId);
    } else {
      // 🧹 Clean up legacy items with typos or missing fields
      cart.items = cart.items.filter((item, index) => {
        const hasTypo = item.productNaame && !item.productName;
        const isValid =
          item.product &&
          item.productName &&
          item.price !== undefined &&
          item.image &&
          item.category;

        if (hasTypo) {
          console.warn("🧹 Typo detected at index", index, ":", item);
        }

        if (!isValid) {
          console.warn("🧹 Removing invalid item at index", index, ":", item);
        }

        return isValid;
      });

      const existingItem = cart.items.find(
        (item) => item.product.toString() === productDoc._id.toString()
      );

      console.log(
        "🧪 Existing item match:",
        existingItem ? existingItem._id : "None"
      );

      if (existingItem) {
        existingItem.quantity += 1;
        console.log(
          "🔁 Incremented quantity for existing item:",
          existingItem._id
        );
      } else {
        cart.items.push({ ...newItem });
        console.log("➕ Pushed new item to cart:", newItem.productName);
      }
    }

    console.log(
      "🧪 Final cart before save:",
      JSON.stringify(cart.items, null, 2)
    );

    const saved = await cart.save();
    console.log("✅ Cart saved:", saved._id);

    const populated = await Cart.findById(saved._id)
      .populate("userId", "firstName lastName")
      .exec();

    console.log("✅ Cart populated with user info:", populated.userId);
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Error creating/updating cart:", err.message);
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

router.delete("/admin/cleanup-legacy-items", async (req, res) => {
  console.log("🧪 Cleanup route triggered");
  console.log("✅ Cart routes mounted at /api/cart");

  try {
    const carts = await Cart.find({});
    let totalRemoved = 0;

    for (const cart of carts) {
      const originalCount = cart.items.length;

      cart.items = cart.items.filter((item) => {
        const isValid =
          item.product &&
          item.productName &&
          item.price !== undefined &&
          item.image &&
          item.category;

        if (!isValid) {
          console.log("🧹 Removing invalid item from cart:", {
            cartId: cart._id,
            item,
          });
        }

        return isValid;
      });

      if (cart.items.length < originalCount) {
        await cart.save();
        totalRemoved += originalCount - cart.items.length;
        console.log(
          `🧹 Cart ${cart._id} cleaned: ${
            originalCount - cart.items.length
          } items removed`
        );
      }
    }

    res.json({ message: "Legacy cart items cleaned up", totalRemoved });
  } catch (err) {
    console.error("❌ Error during cart cleanup:", err);
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
  const { userId } = req.params;
  console.log("📦 Fetching cart for user:", userId);

  try {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      console.warn("⚠️ Cart not found. Creating empty cart for user:", userId);

      cart = new Cart({
        userId,
        items: [],
        total: 0,
      });

      await cart.save();
      console.log("✅ Empty cart created:", cart._id);
    }

    res.status(200).json(cart);
  } catch (err) {
    console.error("❌ Error fetching cart:", err.message);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

router.patch("/admin/fix-cart-items/:userId", async (req, res) => {
  const { userId } = req.params;
  console.log("🧪 Fixing cart for user:", userId);

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const originalCount = cart.items.length;

    cart.items = cart.items.filter((item, index) => {
      const hasTypo =
        item.productNaame || item.prroductName || !item.productName;
      const isValid =
        item.product &&
        item.productName &&
        item.price !== undefined &&
        item.image &&
        item.category;

      if (hasTypo) {
        console.warn(`🧹 Typo detected at index ${index}:`, item);
      }

      if (!isValid) {
        console.warn(`🧹 Removing invalid item at index ${index}:`, item);
      }

      return isValid;
    });

    if (cart.items.length < originalCount) {
      await cart.save();
      console.log(
        `✅ Cart cleaned: ${originalCount - cart.items.length} items removed`
      );
    } else {
      console.log("✅ No invalid items found");
    }

    res.json({
      message: "Cart cleaned",
      removed: originalCount - cart.items.length,
    });
  } catch (err) {
    console.error("❌ Error cleaning cart:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
