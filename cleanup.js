import mongoose from "mongoose";
import Invoice from "./models/Invoice.js";
import dotenv from "dotenv";
import Appointment from "./models/Appointments.js";
import Order from "./models/Orders.js";

dotenv.config();

const migrateInvoices = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const invoices = await Invoice.find().populate("sourceId");

  for (const inv of invoices) {
    try {
      let userId = null;

      if (inv.sourceType === "Appointment" && inv.sourceId) {
        userId = inv.sourceId.userId; // assuming Appointment has userId
      } else if (inv.sourceType === "Order" && inv.sourceId) {
        userId = inv.sourceId.userId; // assuming Order has userId
      }

      if (userId) {
        inv.user = userId;
        await inv.save();
        console.log(
          `✅ Updated invoice ${inv.invoiceNumber} with user ${userId}`
        );
      } else {
        console.warn(`⚠️ No user found for invoice ${inv.invoiceNumber}`);
      }
    } catch (err) {
      console.error(`❌ Error updating invoice ${inv._id}:`, err);
    }
  }

  await mongoose.disconnect();
};

migrateInvoices();
