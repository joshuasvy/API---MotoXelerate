import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import { toProperCase } from "./utils/stringCase.js";

dotenv.config(); // 👈 loads .env

(async () => {
  await mongoose.connect(process.env.MONGO_URI); // now defined

  const products = await Product.find({});
  for (const p of products) {
    const normalized = toProperCase(p.category);
    if (normalized !== p.category) {
      p.category = normalized;
      await p.save();
      console.log(`✅ Normalized: ${p._id} → ${normalized}`);
    }
  }

  await mongoose.disconnect();
  console.log("✨ Done.");
})();
