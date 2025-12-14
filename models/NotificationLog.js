import mongoose from "mongoose";

const NotificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    readAt: { type: Date, default: null },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// Optional: prevent duplicate logs for same user/order
NotificationLogSchema.index({ userId: 1, orderId: 1 }, { unique: false });

export default mongoose.model("NotificationLog", NotificationLogSchema);
