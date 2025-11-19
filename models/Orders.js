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
    enum: ["For approval", "To ship", "Ship", "Delivered", "Completed"],
    default: "For approval",
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
      enum: ["For Approval", "To ship", "Ship", "Delivered", "Completed"],
      default: "For Approval",
    },
    orderDate: { type: Date, default: Date.now },
    deliveryAddress: { type: String },
    notes: { type: String },

    // ✅ Embedded payment tracking
    payment: {
      referenceId: { type: String, unique: true, index: true },
      chargeId: { type: String, default: null },
      amount: { type: Number, required: true },
      status: {
        type: String,
        enum: ["Pending", "Succeeded", "Failed"],
        default: "Pending",
      },
      paidAt: { type: Date, default: null },
    },

    // 👇 New field for notification read state
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
