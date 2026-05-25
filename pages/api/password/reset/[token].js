const bcrypt = require('bcryptjs')
const dbConnect = require('../../../../lib/db')
const User = require('../../../../models/User')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const { password } = req.body
    if (!password) return res.status(400).json({ message: 'Password is required' })
    const user = await User.findOne({ resetToken: req.query.token, resetTokenExpiry: { $gt: new Date() } })
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' })
    user.password = await bcrypt.hash(password, 12)
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save()
    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
