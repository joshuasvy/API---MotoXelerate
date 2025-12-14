import mongoose from "mongoose";
import NotificationLog from "./models/NotificationLog.js";
import dotenv from "dotenv";

dotenv.config();

async function migrateUserIds() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB Atlas");

  const cursor = NotificationLog.find({ userId: { $type: "string" } }).cursor();

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      const objectId = new mongoose.Types.ObjectId(doc.userId);
      await NotificationLog.updateOne(
        { _id: doc._id },
        { $set: { userId: objectId } }
      );
      console.log(`✅ Converted userId for notification ${doc._id}`);
    } catch (err) {
      console.error(`❌ Failed to convert ${doc._id}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log("🔒 Migration complete, disconnected from MongoDB");
}

migrateUserIds();
