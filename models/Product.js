import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true }, // optional external ID
    productName: { type: String, required: true },
    image: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    category: { type: String, required: true },
    specification: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
