import mongoose from "mongoose";

const NotificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return [
          "order",
          "appointment",
          "CancellationRequest",
          "CancellationAccepted",
          "CancellationRejected",
        ].includes(this.type);
      },
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    type: {
      type: String,
      enum: [
        "order",
        "appointment",
        "CancellationRequest",
        "CancellationAccepted",
        "CancellationRejected",
      ],
      required: true,
    },

    // ✅ Customer details
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },

    // ✅ Order summary
    deliveryAddress: { type: String },
    paymentMethod: { type: String },
    totalOrder: { type: Number },
    notes: { type: String },

    // ✅ Notification content
    message: { type: String, required: true },
    reason: { type: String },
    status: { type: String },

    // ✅ Richer order details
    items: [
      {
        product: {
          _id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
          productName: { type: String },
          specification: { type: String },
          price: { type: Number },
          image: { type: String },
        },
        quantity: { type: Number },
        status: { type: String },
      },
    ],

    // ✅ Payment cancellation details
    payment: {
      cancellationStatus: { type: String },
      cancellationReason: { type: String },
      cancelledAt: { type: Date, default: null },
    },

    // ✅ Richer appointment details
    serviceType: { type: String },
    date: { type: Date },
    time: { type: String },

    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for faster queries
NotificationLogSchema.index({ userId: 1, orderId: 1 }, { unique: false });
NotificationLogSchema.index({ userId: 1, appointmentId: 1 }, { unique: false });

export default mongoose.model("NotificationLog", NotificationLogSchema);
