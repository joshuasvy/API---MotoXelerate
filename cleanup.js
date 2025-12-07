// cleanup.js
import mongoose from "mongoose";
import Invoice from "./models/Invoice.js";

async function removeDuplicateInvoices() {
  try {
    // ✅ Connect to MongoDB
    await mongoose.connect(
      "mongodb+srv://joshuapaulcortez_db_user:motoxelerate@motoxeleratecluster.kzhtuvj.mongodb.net/motoXelerate",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ Connected to MongoDB");

    // ✅ Group by sourceId + referenceId
    const invoices = await Invoice.aggregate([
      { $sort: { createdAt: 1 } }, // ensure oldest first
      {
        $group: {
          _id: { sourceId: "$sourceId", referenceId: "$referenceId" },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    for (const group of invoices) {
      const [keep, ...remove] = group.ids;
      await Invoice.deleteMany({ _id: { $in: remove } });
      console.log(
        `🧹 Cleaned ${remove.length} duplicates for order ${group._id.sourceId}`
      );
    }

    console.log("✅ Duplicate invoices removed");
  } catch (err) {
    console.error("❌ Error cleaning invoices:", err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

removeDuplicateInvoices();
