import jwt from "jsonwebtoken";
import Users from "../models/Users.js";
import Admin from "../models/Admin.js"; // ✅ Import your admin model

export const authToken = async (req, res, next) => {
  try {
    console.log("🔐 Incoming token:", req.headers.authorization);
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔍 Try finding user first
    let account = await Users.findById(decoded.id);

    // 🔍 If not found, try admin
    if (!account) {
      account = await Admin.findById(decoded.id);
    }

    if (!account) return res.status(404).json({ message: "Account not found" });

    req.user = {
      id: account._id,
      role: account.role,
      name: account.name,
    };

    next();
  } catch (err) {
    console.error("❌ Auth error:", err.message);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
