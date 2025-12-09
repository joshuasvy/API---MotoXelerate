import mongoose from "mongoose";
import Invoice from "./models/Invoice.js";
import Appointment from "./models/Appointments.js";
import User from "./models/Users.js";

const MONGO_URI =
  "mongodb+srv://joshuapaulcortez_db_user:motoxelerate@motoxeleratecluster.kzhtuvj.mongodb.net/motoXelerate"; // adjust

async function backfillCustomerInfo() {
  await mongoose.connect(MONGO_URI);

  console.log("🔄 Backfilling invoices missing customer info...");

  const invoices = await Invoice.find({
    sourceType: "Appointment",
    $or: [
      { customerEmail: { $exists: false } },
      { customerPhone: { $exists: false } },
    ],
  });

  for (const invoice of invoices) {
    const appointment = await Appointment.findById(invoice.sourceId);
    if (!appointment) continue;

    const user = await User.findById(appointment.userId);
    if (!user) continue;

    invoice.customerEmail = user.email;
    invoice.customerPhone = user.contact;

    await invoice.save();
    console.log(`✅ Updated invoice ${invoice.invoiceNumber}`);
  }

  console.log("🎉 Backfill complete.");
  await mongoose.disconnect();
}

backfillCustomerInfo();
