import mongoose from "mongoose";
import { toProperCase } from "../utils/stringCase.js"; // adjust path as needed

const productSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    image: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    category: { type: String, required: true },
    specification: { type: String, required: true },
  },
  { timestamps: true }
);

// Normalize on create/save
productSchema.pre("save", function (next) {
  if (this.isModified("category") && typeof this.category === "string") {
    this.category = toProperCase(this.category);
  }
  next();
});

// Normalize on findOneAndUpdate / findByIdAndUpdate
productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  // handle direct set and $set payloads
  const category = update.category ?? (update.$set && update.$set.category);

  if (typeof category === "string") {
    const normalized = toProperCase(category);
    if (update.$set && update.$set.category) {
      update.$set.category = normalized;
    } else {
      update.category = normalized;
    }
    this.setUpdate(update);
  }
  next();
});

export default mongoose.model("Product", productSchema);
