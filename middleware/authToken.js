import jwt from "jsonwebtoken";
import Users from "../models/Users.js";
import Admin from "../models/Admin.js";

export const authToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("🔐 Incoming Authorization header:", authHeader);

    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "No Authorization header provided" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.warn("⚠️ Authorization header missing 'Bearer ' prefix");
      return res.status(401).json({ message: "Invalid token format" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔐 Extracted token preview:", token?.slice(0, 20));

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Decoded JWT payload:", decoded);

    // 🔍 Try finding user first
    let account = await Users.findById(decoded.id);

    // 🔍 If not found, try admin
    if (!account) {
      account = await Admin.findById(decoded.id);
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const fullName =
      account.firstName && account.lastName
        ? `${account.firstName} ${account.lastName}`
        : account.name || "Unknown";

    req.user = {
      id: account._id,
      role: account.role,
      name: fullName,
    };

    next();
  } catch (err) {
    console.error("❌ JWT verification error:", err.message);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
