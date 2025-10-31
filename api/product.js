import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const router = express.Router();

// 🆕 Create a new product
router.post("/", async (req, res) => {
  const { productName, image, price, stock, category, specification } =
    req.body;

  try {
    const newProduct = new Product({
      productName,
      image,
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

// ✏️ Update product by ID
router.put("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating product:", err);
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
