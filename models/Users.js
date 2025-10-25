import mongoose from "mongoose";
const usersSchema = new mongoose.Schema({
  email: String,
  password: String,
});
export default mongoose.model("Users", usersSchema);
