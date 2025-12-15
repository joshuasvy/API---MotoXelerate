// scripts/fixPaymentIndex.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  try {
    // 1. Connect to your MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // 2. Drop the old index if it exists
    try {
      await db.collection("appointments").dropIndex("payment.referenceId_1");
      console.log("🗑️ Dropped old unique index on payment.referenceId");
    } catch (err) {
      console.warn("⚠️ No existing index to drop:", err.message);
    }

    // 3. Recreate as partial unique index (only enforce when field exists)
    await db.collection("appointments").createIndex(
      { "payment.referenceId": 1 },
      {
        unique: true,
        partialFilterExpression: { "payment.referenceId": { $exists: true } },
      }
    );
    console.log("✅ Created partial unique index on payment.referenceId");

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

run();
