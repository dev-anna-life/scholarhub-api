const Notification = require('../../../models/Notification')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const user = await protect(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const notifications = await Notification.find({ user: user._id })
        .populate('fromUser', 'name username avatar')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
      return res.json(notifications)
    }

    if (req.method === 'POST') {
      await Notification.updateMany({ user: user._id, read: false }, { $set: { read: true } })
      return res.json({ message: 'Notifications marked as read' })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
