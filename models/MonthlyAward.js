const mongoose = require("mongoose")

const monthlyAwardSchema = new mongoose.Schema({
  category: { type: String, enum: ["educational", "meme", "news"], required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  engagementScore: { type: Number, default: 0 },
  label: { type: String },
}, { timestamps: true })

monthlyAwardSchema.index({ month: 1, year: 1, category: 1 }, { unique: true })

module.exports = mongoose.models.MonthlyAward || mongoose.model("MonthlyAward", monthlyAwardSchema)
