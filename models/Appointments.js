import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  date: { type: String, required: true }, // ✅ full date object
  time: { type: String, required: true }, // ✅ "14:00" or "2:30 PM"
  status: { type: String, default: "pending" }, // or "confirmed", "cancelled"
});

export default mongoose.model("Appointment", appointmentSchema);
