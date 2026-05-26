const Conversation = require('../../../models/Conversation')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const currentUser = await protect(req, res)
    if (!currentUser) return
    const conversations = await Conversation.find({ participants: currentUser._id })
      .populate('participants', 'name school level badge')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean()

    const result = conversations.map(conv => {
      const other = conv.participants?.find(p => p._id.toString() !== currentUser._id.toString())
      return {
        user: other || { _id: '', name: 'Unknown', school: '', level: '' },
        lastMessage: conv.lastMessage || null,
        unread: 0,
      }
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
