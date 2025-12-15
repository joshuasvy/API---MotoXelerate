import mongoose from "mongoose";

const NotificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Only required for user-facing notifications
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
        "AppointmentCreatedAdmin", // ✅ new admin type
        "AppointmentStatusAdmin", // ✅ new admin type
      ],
      required: true,
    },
    customerName: { type: String },
    message: { type: String, required: true },
    reason: { type: String },
    status: { type: String },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index still fine
NotificationLogSchema.index({ userId: 1, orderId: 1 }, { unique: false });

export default mongoose.model("NotificationLog", NotificationLogSchema);
