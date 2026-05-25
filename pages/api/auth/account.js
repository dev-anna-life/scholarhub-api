const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Post = require('../../../models/Post')
const Notification = require('../../../models/Notification')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return
    await Promise.all([
      Notification.deleteMany({ $or: [{ user: user._id }, { fromUser: user._id }] }),
      Post.updateMany({ author: user._id }, { $set: { author: null } }),
      User.findByIdAndDelete(user._id),
    ])
    res.json({ message: 'Account deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
