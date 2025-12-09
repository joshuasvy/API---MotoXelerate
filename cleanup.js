import mongoose from "mongoose";
import Appointment from "./models/Appointments.js";
import User from "./models/Users.js";

const MONGO_URI =
  "mongodb+srv://joshuapaulcortez_db_user:motoxelerate@motoxeleratecluster.kzhtuvj.mongodb.net/motoXelerate"; // adjust to your DB

async function backfillAppointments() {
  await mongoose.connect(MONGO_URI);

  console.log("🔄 Backfilling appointments with customer email and phone...");

  const appointments = await Appointment.find({
    $or: [
      { customerEmail: { $exists: false } },
      { customerPhone: { $exists: false } },
    ],
  });

  for (const appt of appointments) {
    try {
      const user = await User.findById(appt.userId);
      if (!user) {
        console.warn(`⚠️ User not found for appointment ${appt._id}`);
        continue;
      }

      appt.customerEmail = user.email;
      appt.customerPhone = user.contact;

      await appt.save();
      console.log(`✅ Updated appointment ${appt._id} with email/contact`);
    } catch (err) {
      console.error(`❌ Error updating appointment ${appt._id}:`, err.message);
    }
  }

  console.log("🎉 Appointment backfill complete.");
  await mongoose.disconnect();
}

backfillAppointments();
