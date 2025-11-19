import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// 🆕 Create a new product
router.post("/", async (req, res) => {
  const { productName, image, price, stock, category, specification } =
    req.body;

  console.log("📥 Incoming product payload:", req.body);

  const missingFields = [];
  if (!productName) missingFields.push("productName");
  if (!image) missingFields.push("image");
  if (price == null || price === "") missingFields.push("price");
  if (stock == null || stock === "") missingFields.push("stock");
  if (!category) missingFields.push("category");
  if (!specification) missingFields.push("specification");

  if (missingFields.length > 0) {
    console.warn("⚠️ Missing required fields:", missingFields);
    return res.status(400).json({
      error: "Missing required fields",
      missing: missingFields,
    });
  }

  try {
    const newProduct = new Product({
      productName: productName.trim(),
      image: image.trim(),
      price,
      stock,
      category,
      specification,
    });

    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Error creating product:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📦 Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update product by ID
router.put("/:id", async (req, res) => {
  console.log("📥 PUT /product/:id hit");
  console.log("🧾 Incoming payload:", req.body);

  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      console.warn("⚠️ Product not found:", req.params.id);
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("✅ Product updated:", updated);
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ error: err.message });
  }
});

// routes/product.js
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

// 🧹 TEMP: Remove legacy product_Id field from all products
router.delete("/cleanup-legacy-productId", async (req, res) => {
  try {
    const result = await Product.updateMany({}, { $unset: { product_Id: "" } });
    console.log("🧹 Cleanup result:", result);
    res.json({ message: "Legacy product_Id fields removed", result });
  } catch (err) {
    console.error("❌ Cleanup error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
