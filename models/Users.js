import mongoose from "mongoose";
const usersSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: { type: String },
});
export default mongoose.model("Users", usersSchema);
