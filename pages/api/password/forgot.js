const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })
    const user = await User.findOne({ email })
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' })
    const token = crypto.randomBytes(32).toString('hex')
    user.resetToken = token
    user.resetTokenExpiry = new Date(Date.now() + 3600000)
    await user.save()
    res.json({ message: 'If that email exists, a reset link has been sent', token })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
