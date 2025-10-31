import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: { type: String, required: true },
  image: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  specification: { type: String },
  category: { type: String, required: true },
  status: {
    type: String,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Processing",
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
    items: {
      type: [orderItemSchema],
      validate: [
        (val) => val.length > 0,
        "Order must contain at least one item",
      ],
    },
    totalOrder: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["Gcash", "Cash on Delivery", "Pick up"],
      default: "Gcash",
    },
    orderRequest: {
      type: String,
      enum: ["For Approval", "Approved", "Rejected"],
      default: "For Approval",
    },
    orderDate: { type: Date, default: Date.now },
    deliveryAddress: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
