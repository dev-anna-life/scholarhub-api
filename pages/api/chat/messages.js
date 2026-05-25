const Message = require('../../../models/Message')
const Conversation = require('../../../models/Conversation')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const user = await protect(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const messages = await Message.find({ conversation: req.query.id })
        .populate('sender', 'name username avatar')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
      return res.json(messages.reverse())
    }

    if (req.method === 'POST') {
      const { conversationId, text } = req.body
      if (!conversationId || !text) return res.status(400).json({ message: 'conversationId and text required' })

      const conv = await Conversation.findById(conversationId)
      if (!conv) return res.status(404).json({ message: 'Conversation not found' })
      if (!conv.participants.some(p => p.toString() === user._id.toString())) {
        return res.status(403).json({ message: 'Not a participant' })
      }

      const message = await Message.create({ conversation: conversationId, sender: user._id, text })
      conv.lastMessage = message._id
      conv.updatedAt = new Date()
      await conv.save()

      const populated = await Message.findById(message._id).populate('sender', 'name username avatar').lean()
      return res.status(201).json(populated)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
