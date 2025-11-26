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

    let account = null;

    // 🔍 If role is admin, look in Admins collection
    if (decoded.role === "admin") {
      account = await Admin.findById(decoded.id);
    } else {
      account = await Users.findById(decoded.id);
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    req.user = {
      id: account._id,
      role: account.role,
      name: account.firstName
        ? `${account.firstName} ${account.lastName}`
        : account.name || "Unknown",
    };
    next();
  } catch (err) {
    console.error("❌ JWT verification error:", err.message);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
