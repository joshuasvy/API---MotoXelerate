import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", // ✅ links to your Product model
    required: true,
  },
  selected: {
    type: Boolean,
    default: false, // ✅ useful for multi-select checkout
  },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users", // ✅ links to your Users model
      required: true,
      unique: true, // ✅ ensures one cart per user
    },
    items: {
      type: [cartItemSchema],
      default: [], // ✅ ensures empty array on creation
    },
  },
  { timestamps: true }
);

export default mongoose.model("Cart", cartSchema);
