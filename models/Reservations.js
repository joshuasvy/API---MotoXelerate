import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  serviceType: { type: String, required: true },
  mechanic: { type: String, required: true },
  schedule: { type: String, required: true }, // or Date if you want to store as ISO
  time: { type: String, required: true },
  fee: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
    default: "Pending",
  },
});

export default mongoose.model("Reservation", reservationSchema);
