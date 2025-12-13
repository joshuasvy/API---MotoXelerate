import mongoose from "mongoose";
import User from "./Users.js";

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

invoiceItemSchema.pre("validate", function (next) {
  if (typeof this.quantity === "number" && typeof this.unitPrice === "number") {
    this.lineTotal = this.quantity * this.unitPrice;
  }
  next();
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true },
    sourceType: {
      type: String,
      enum: ["Order", "Appointment"],
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
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Unpaid", "Paid", "Cancelled", "Refunded"],
      default: "Unpaid",
    },
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

invoiceSchema.pre("save", async function (next) {
  try {
    if (
      this.sourceType === "Appointment" &&
      this.sourceId &&
      (!this.customerEmail || !this.customerPhone)
    ) {
      const appointment = await mongoose
        .model("Appointment")
        .findById(this.sourceId);
      if (appointment) {
        const user = await User.findById(appointment.userId);
        if (user) {
          this.customerEmail = user.email;
          this.customerPhone = user.contact;
        }
      }
    }
    next();
  } catch (err) {
    console.error("❌ Error in Invoice pre-save hook:", err);
    next(err);
  }
});

export default mongoose.model("Invoice", invoiceSchema);
