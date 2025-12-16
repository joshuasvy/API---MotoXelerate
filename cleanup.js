// scripts/fixAppointmentNotifications.js
import mongoose from "mongoose";
import NotificationLog from "./models/NotificationLog.js";
import Appointments from "./models/Appointments.js";
import dotenv from "dotenv";
dotenv.config();

async function fixAppointmentNotifications() {
  await mongoose.connect(process.env.MONGO_URI);

  // Find all notifications of type "appointment" missing userId
  const brokenNotifs = await NotificationLog.find({
    type: "appointment",
    $or: [{ userId: { $exists: false } }, { userId: null }],
  });

  console.log(`Found ${brokenNotifs.length} broken appointment notifications`);

  for (const notif of brokenNotifs) {
    // Look up the appointment to get its userId
    const appointment = await Appointments.findById(notif.appointmentId);
    if (!appointment) {
      console.warn(`⚠️ Appointment not found for notif ${notif._id}`);
      continue;
    }

    notif.userId = appointment.userId;
    await notif.save();
    console.log(
      `✅ Fixed notif ${notif._id} with userId ${appointment.userId}`
    );
  }

  await mongoose.disconnect();
}

fixAppointmentNotifications().catch((err) => {
  console.error("❌ Error fixing appointment notifications:", err);
});
