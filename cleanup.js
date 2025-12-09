import mongoose from "mongoose";
import Invoice from "./models/Invoice.js";

const MONGO_URI =
  "mongodb+srv://joshuapaulcortez_db_user:motoxelerate@motoxeleratecluster.kzhtuvj.mongodb.net/motoXelerate"; // adjust to your DB

async function patchInvoices() {
  await mongoose.connect(MONGO_URI);

  console.log("🔄 Patching invoices with lowercase sourceType...");

  const result = await Invoice.updateMany(
    { sourceType: "appointment" }, // find lowercase values
    { $set: { sourceType: "Appointment" } } // normalize to capitalized
  );

  console.log(
    `✅ Updated ${result.modifiedCount} invoices to use 'Appointment'`
  );
  await mongoose.disconnect();
}

patchInvoices();
