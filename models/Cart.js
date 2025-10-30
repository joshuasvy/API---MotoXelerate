import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  selected: {
    type: Boolean,
    default: false,
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
