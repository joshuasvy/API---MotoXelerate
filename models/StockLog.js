import mongoose from "mongoose";

const stockLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  change: { type: Number, required: true }, // e.g. -2 or +2
  reason: { type: String, required: true }, // e.g. "Order", "Refund", "Restock"
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("StockLog", stockLogSchema);
