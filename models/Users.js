import mongoose from "mongoose";
import bcrypt from "bcrypt";

const usersSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Password hashing
usersSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("Users", usersSchema);
