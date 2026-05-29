const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['like', 'comment', 'follow', 'gift', 'message', 'post', 'system'], default: 'system' },
  text: { type: String, default: '' },
  read: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
