const Message = require('../../../models/Message')
const Conversation = require('../../../models/Conversation')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { receiverId, text } = req.body
    if (!receiverId || !text) return res.status(400).json({ message: 'receiverId and text required' })

    // Find all conversations for current user, then find the one with the receiver
    const allConvs = await Conversation.find({ participants: user._id }).lean()
    let conv = allConvs.find(c =>
      c.participants && c.participants.some(p => p.toString() === receiverId)
    )

    if (!conv) {
      conv = await Conversation.create({
        participants: [user._id, receiverId],
      })
    }

    const message = await Message.create({ conversation: conv._id, sender: user._id, text })
    // Update lastMessage on the conversation document
    await Conversation.findByIdAndUpdate(conv._id, { lastMessage: message._id, updatedAt: new Date() })

    const populated = await Message.findById(message._id).populate('sender', 'name school level').lean()
    return res.status(201).json(populated)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
