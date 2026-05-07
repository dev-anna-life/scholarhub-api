const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String },
    googleId: { type: String },
    level: { type: String, enum: ['JSS', 'SSS', 'University', 'Postgrad' ]},
    school: { type: String },
    state: { type: String },
    interests: [{ type: String }],
    coins: { type: Number, default: 50 },
    streak: { type: Number, default: 0 },
    lastPostDate: { type: Date },
    badge: { type: String, default: 'Beginner' },
    isVerified: { type: Boolean, default: false },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)