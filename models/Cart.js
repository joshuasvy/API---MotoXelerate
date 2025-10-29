import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", // ✅ must match your Product model name
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
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
      ref: "Users", // ✅ must match your Users model name
      required: true,
    },

    items: [cartItemSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Cart", cartSchema);
