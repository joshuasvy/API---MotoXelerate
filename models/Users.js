import mongoose from "mongoose";
import bcrypt from "bcrypt";

const usersSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  image: {
    type: String,
    default:
      "https://res.cloudinary.com/dhh37ekzf/image/upload/v1761966774/Starter_pfp_ymrios.jpg",
  },
  address: { type: String, required: true },
  contact: {
    type: String,
    required: true,
    unique: true,
    match: /^\+63\s\d{3}\s\d{3}\s\d{4}$/,
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    sparse: true,
  },
});

// ✅ Hash password before saving
usersSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("Users", usersSchema);
