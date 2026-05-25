const mongoose = require('mongoose')

const purchaseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, enum: ['buy', 'gift'], required: true },
}, { timestamps: true })

module.exports = mongoose.model('Purchase', purchaseSchema)
