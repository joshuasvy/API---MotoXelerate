import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      "For Approval",
      "To ship",
      "Ship",
      "Delivered",
      "Completed",
      "Cancelled",
    ],
    default: "For Approval",
  },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: [orderItemSchema],
    totalOrder: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["GCash", "Cash on Delivery", "Pick up"],
      default: "GCash",
    },
    orderDate: { type: Date, default: Date.now },
    deliveryAddress: { type: String },
    notes: { type: String },
    read: { type: Boolean, default: false },
    payment: {
      referenceId: { type: String, unique: true, sparse: true },
      chargeId: { type: String, default: null },
      amount: { type: Number, required: true },
      status: {
        type: String,
        enum: ["Pending", "Succeeded", "Failed"],
        default: "Pending",
      },
      paidAt: { type: Date, default: null },
      method: { type: String, default: "GCash" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
