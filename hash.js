// hash.js
import bcrypt from "bcrypt";

const run = async () => {
  const plainPassword = "admin";
  const hashed = await bcrypt.hash(plainPassword, 10);
  console.log("🔐 Hashed password:", hashed);
};

run();
