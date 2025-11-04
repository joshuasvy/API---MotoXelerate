import mongoose from "mongoose";
import Cart from "../models/Cart.js";

mongoose.connect(
  "mongodb+srv://joshuapaulcortez_db_user:motoxelerate@motoxeleratecluster.kzhtuvj.mongodb.net/motoXelerate"
); // replace with your actual connection string

const fixCartTypos = async () => {
  const carts = await Cart.find();

  for (const cart of carts) {
    let updated = false;

    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];

      if (item.productNaame && !item.productName) {
        cart.items[i].productName = item.productNaame;
        delete cart.items[i].productNaame;
        updated = true;

        console.log("🧼 Fixed typo in cart item:", {
          cartId: cart._id,
          itemId: item._id,
          correctedName: cart.items[i].productName,
        });
      }
    }

    if (updated) {
      cart.markModified("items");
      await cart.save();
      console.log("✅ Cart updated:", cart._id);
    }
  }

  console.log("🎉 All carts cleaned up.");
  mongoose.disconnect();
};

fixCartTypos();
