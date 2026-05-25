const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return
    const { name, username, bio, avatar, coins } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (bio !== undefined) updates.bio = bio
    if (avatar !== undefined) updates.avatar = avatar
    if (coins !== undefined) updates.coins = coins
    if (username !== undefined) {
      const existing = await User.findOne({ username, _id: { $ne: user._id } })
      if (existing) return res.status(400).json({ message: 'Username already taken' })
      updates.username = username
    }
    const updated = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true }).select('-password')
    res.json({ user: updated.toObject() })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
