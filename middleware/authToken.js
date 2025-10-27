import jwt from "jsonwebtoken";
import Users from "../models/Users.js"; // ✅ Make sure this import exists

export const authToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Users.findById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = {
      id: user._id,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (err) {
    console.error("❌ Auth error:", err);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
