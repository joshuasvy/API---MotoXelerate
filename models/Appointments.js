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
    service_Type: { type: String, required: true },
    mechanic: { type: String, default: "" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    service_Charge: { type: Number, required: true },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
    },

    // 👇 New field for notification read state
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Normalize before save
appointmentSchema.pre("save", function (next) {
  if (this.isModified("status") && typeof this.status === "string") {
    this.status = toProperCase(this.status);
  }
  next();
});

// Normalize before update
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
