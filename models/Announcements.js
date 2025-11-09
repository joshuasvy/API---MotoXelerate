import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    announcementName: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true }, // When the announcement becomes active
    endDate: { type: Date, required: true }, // When the announcement expires
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

export default mongoose.model("Announcement", announcementSchema);
