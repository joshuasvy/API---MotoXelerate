import mongoose from "mongoose";
import Appointment from "../models/Appointments.js";
import User from "../models/Users.js";
import Invoice from "../models/Invoice.js";

const MONGO_URI =
  "mongodb+srv://joshuapaulcortez_db_user:motoxelerate@motoxeleratecluster.kzhtuvj.mongodb.net/motoXelerate"; // adjust to your DB

async function migrateAppointmentInvoices() {
  await mongoose.connect(MONGO_URI);

  console.log("🔄 Starting migration of appointment invoices...");

  // Find invoices linked to appointments
  const invoices = await Invoice.find({ sourceType: "Appointment" });

  for (const invoice of invoices) {
    try {
      const appointment = await Appointment.findById(invoice.sourceId);
      if (!appointment) {
        console.warn(`⚠️ Appointment not found for invoice ${invoice._id}`);
        continue;
      }

      const user = await User.findById(appointment.userId);

      // Backfill fields
      invoice.appointmentId = appointment._id;
      invoice.serviceType = appointment.service_Type;
      invoice.mechanic = appointment.mechanic;
      invoice.date = appointment.date;
      invoice.time = appointment.time;
      invoice.appointmentStatus = appointment.status;

      if (user) {
        invoice.customerEmail = user.email;
        invoice.customerPhone = user.contact;
      }

      await invoice.save();
      console.log(`✅ Updated invoice ${invoice.invoiceNumber}`);
    } catch (err) {
      console.error(`❌ Error updating invoice ${invoice._id}:`, err.message);
    }
  }

  console.log("🎉 Migration complete.");
  await mongoose.disconnect();
}

migrateAppointmentInvoices();
