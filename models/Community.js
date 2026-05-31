const mongoose = require('mongoose')

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['department', 'faculty', 'school', 'general'], required: true },
  school: { type: String },
  faculty: { type: String },
  department: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

communitySchema.index({ name: 1, type: 1, school: 1, faculty: 1, department: 1 }, { unique: true })

module.exports = mongoose.models.Community || mongoose.model('Community', communitySchema)
