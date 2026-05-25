const Conversation = require('../../../models/Conversation')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const conversations = await Conversation.find({ participants: user._id })
      .populate('participants', 'name username avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean()
    res.json(conversations)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
