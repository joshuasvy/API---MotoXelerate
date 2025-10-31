import mongoose from "mongoose";
import Product from "./models/Product.js";

mongoose.connect(
  "mongodb+srv://joshuapaulcortez_db_user:motoxelerate@motoxeleratecluster.kzhtuvj.mongodb.net/motoXelerate",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

(async () => {
  try {
    const result = await Product.updateMany({}, { $unset: { product_Id: "" } });
    console.log("🧹 Cleanup complete:", result);
  } catch (err) {
    console.error("❌ Error during cleanup:", err);
  } finally {
    mongoose.disconnect();
  }
})();
