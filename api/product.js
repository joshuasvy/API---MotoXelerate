import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const {
    product_Name,
    image,
    product_Price,
    stock,
    category,
    product_Specification,
  } = req.body;

  try {
    // 🔑 Generate a random ObjectId string
    const product_Id = new mongoose.Types.ObjectId().toString();

    const newProduct = new Product({
      product_Id,
      product_Name,
      image,
      product_Price,
      stock,
      category,
      product_Specification,
    });

    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
