import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  customer_Name: { type: String, required: true },
  service_Type: { type: String, required: true },
  mechanic: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { type: String, default: "pending" },
});

export default mongoose.model("Appointment", appointmentSchema);
