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
    customerName: { type: String },
    message: { type: String, required: true },
    reason: { type: String },
    status: { type: String },

    // ✅ Richer order details
    items: [
      {
        product: {
          _id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
          image: { type: String },
        },
        status: { type: String },
      },
    ],

    // ✅ Richer appointment details
    serviceType: { type: String }, // e.g. "Change Oil"
    date: { type: Date }, // scheduled date
    time: { type: String }, // scheduled time (string for flexibility)

    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for faster queries
NotificationLogSchema.index({ userId: 1, orderId: 1 }, { unique: false });
NotificationLogSchema.index({ userId: 1, appointmentId: 1 }, { unique: false });

export default mongoose.model("NotificationLog", NotificationLogSchema);
