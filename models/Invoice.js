import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true },
    sourceType: {
      type: String,
      enum: ["order", "appointment"],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sourceType",
    },
    customerName: { type: String, required: true },
    customerAddress: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    paymentMethod: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Succeeded", "Failed"],
      default: "Pending",
    },
    referenceId: { type: String, index: true },
    paidAt: { type: Date, default: null },
    items: [invoiceItemSchema],
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Unpaid", "Paid", "Cancelled", "Refunded"],
      default: "Unpaid",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
