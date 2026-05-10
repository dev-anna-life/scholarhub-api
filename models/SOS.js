const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, default: "Student needs immediate help!" },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
    status: { type: String, enum: ["active", "resolved"], default: "active" },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SOS", sosSchema);
