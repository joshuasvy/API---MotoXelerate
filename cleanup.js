import mongoose from "mongoose";
import Appointment from "./models/Appointments.js";
import dotenv from "dotenv";

const toProperCase = (str = "") =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

dotenv.config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const appointments = await Appointment.find({});
  for (const a of appointments) {
    const normalized = toProperCase(a.status);
    if (normalized !== a.status) {
      a.status = normalized;
      await a.save();
      console.log(`✅ Normalized: ${a._id} → ${normalized}`);
    }
  }

  await mongoose.disconnect();
  console.log("✨ Done.");
})();
