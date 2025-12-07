import mongoose from "mongoose";
import Invoice from "./models/Invoice.js";
import User from "./models/Users.js";

async function backfillInvoiceContacts() {
  await mongoose.connect(process.env.MONGO_URI);

  const invoices = await Invoice.find({
    $or: [
      { customerEmail: { $exists: false } },
      { customerPhone: { $exists: false } },
    ],
  });

  console.log(`Found ${invoices.length} invoices missing contact info`);

  for (const inv of invoices) {
    try {
      // Assuming sourceId points to the order, and order has userId
      // If you store userId directly in invoice, adjust accordingly
      const user = await User.findById(inv.sourceId); // or order.userId if sourceId is an order
      if (!user) {
        console.warn(`⚠️ No user found for invoice ${inv._id}`);
        continue;
      }

      inv.customerEmail = user.email;
      inv.customerPhone = user.contact;

      await inv.save();
      console.log(
        `✅ Updated invoice ${inv.invoiceNumber} with ${user.email}, ${user.contact}`
      );
    } catch (err) {
      console.error(`❌ Failed to update invoice ${inv._id}`, err);
    }
  }

  await mongoose.disconnect();
}

backfillInvoiceContacts();
