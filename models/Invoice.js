import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Keep lineTotal consistent
invoiceItemSchema.pre("validate", function (next) {
  if (typeof this.quantity === "number" && typeof this.unitPrice === "number") {
    this.lineTotal = this.quantity * this.unitPrice;
  }
  next();
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true },

    // Use capitalized values to match model names for refPath
    sourceType: {
      type: String,
      enum: ["Order", "Appointment"], // must match mongoose.model names
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sourceType",
    },

    // Customer
    customerName: { type: String, required: true },
    customerAddress: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },

    // Payment
    paymentMethod: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Succeeded", "Failed"],
      default: "Pending",
    },
    referenceId: { type: String, index: true },
    paidAt: { type: Date, default: null },

    // Items
    items: { type: [invoiceItemSchema], default: [] },

    // Totals
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Unpaid", "Paid", "Cancelled", "Refunded"],
      default: "Unpaid",
    },

    // Appointment-specific fields (optional; safe for Order invoices)
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    serviceType: { type: String },
    mechanic: { type: String },
    date: { type: Date },
    time: { type: String },
    appointmentStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
    },
  },
  { timestamps: true }
);

// Keep subtotal/total consistent with items
invoiceSchema.pre("validate", function (next) {
  if (Array.isArray(this.items)) {
    const subtotal = this.items.reduce(
      (sum, item) => sum + (item.lineTotal || 0),
      0
    );
    this.subtotal = subtotal;
    this.total = subtotal;
  }
  next();
});

export default mongoose.model("Invoice", invoiceSchema);
