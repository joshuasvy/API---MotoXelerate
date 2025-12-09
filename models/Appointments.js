import mongoose from "mongoose";
const toProperCase = (str = "") =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    customer_Name: { type: String, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String },
    service_Type: { type: String, required: true },
    mechanic: { type: String, default: "" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    service_Charge: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
    },
    read: { type: Boolean, default: false },
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
      method: { type: String, default: "GCash" },
    },
  },
  { timestamps: true }
);

appointmentSchema.pre("save", function (next) {
  if (this.isModified("status") && typeof this.status === "string") {
    this.status = toProperCase(this.status);
  }
  next();
});

appointmentSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const status = update.status ?? (update.$set && update.$set.status);

  if (typeof status === "string") {
    const normalized = toProperCase(status);
    if (update.$set && update.$set.status) {
      update.$set.status = normalized;
    } else {
      update.status = normalized;
    }
    this.setUpdate(update);
  }
  next();
});

export default mongoose.model("Appointment", appointmentSchema);
