import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  product_Id: {
  type: String,
  required: true,
  unique: true,
  },
  product_Name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
    unique: true,
  },
  product_Price: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  product_Specification: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Product", productSchema);
