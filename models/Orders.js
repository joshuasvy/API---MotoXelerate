import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  product_Name: String,
  quantity: Number,
  product_Price: String,
  image: String,
  status: {
    type: String,
    default: "Processing", // ✅ or "For approval" if that's your initial state
  },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    customerName: { type: String, required: true }, // ✅ new field
    items: [orderItemSchema],
    total: { type: String, required: true },
    payment: { type: String, default: "Pending" },
    status: { type: String, default: "For Approval" },
    orderDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
