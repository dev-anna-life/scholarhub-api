const mongoose = require('mongoose')

const schoolRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String },
  level: { type: String, enum: ['Secondary', 'University'] },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true })

module.exports = mongoose.models.SchoolRequest || mongoose.model('SchoolRequest', schoolRequestSchema)
