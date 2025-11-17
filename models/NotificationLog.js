import mongoose from "mongoose";

const NotificationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  status: { type: String },
  readAt: { type: Date, default: Date.now },
});

NotificationLogSchema.index({ userId: 1, orderId: 1 }, { unique: true });

export default mongoose.model("NotificationLog", NotificationLogSchema);
