import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true }, // product or service name
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true }, // quantity × unitPrice
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true }, // e.g. INV-2025-0001

    // Link back to source
    sourceType: {
      type: String,
      enum: ["order", "appointment"],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sourceType", // dynamically references Order or Appointment
    },

    // Customer info
    customerName: { type: String, required: true },
    customerAddress: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },

    // Payment info
    paymentMethod: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Succeeded", "Failed"],
      default: "Pending",
    },
    referenceId: { type: String, index: true },
    paidAt: { type: Date, default: null },

    // Items
    items: [invoiceItemSchema],

    // Totals
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },

    // Status
    status: {
      type: String,
      enum: ["unpaid", "paid", "cancelled", "refunded"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
