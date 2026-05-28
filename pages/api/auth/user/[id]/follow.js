const User = require('../../../../../models/User')
const Notification = require('../../../../../models/Notification')
const { protect } = require('../../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const targetId = req.query.id
    if (targetId === user._id.toString()) return res.status(400).json({ message: 'Cannot follow yourself' })

    const target = await User.findById(targetId)
    if (!target) return res.status(404).json({ message: 'User not found' })

    const idx = user.following.indexOf(targetId)
    if (idx > -1) {
      user.following.splice(idx, 1)
      target.followers = target.followers.filter(f => f.toString() !== user._id.toString())
    } else {
      user.following.push(targetId)
      target.followers.push(user._id)
      await Notification.create({ user: targetId, fromUser: user._id, type: 'follow', text: 'started following you' })
    }
    await user.save()
    await target.save()

    const updated = await User.findById(user._id).select('-password')
    res.json({ user: updated.toObject(), following: idx === -1 })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
