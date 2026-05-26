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

    let conv = await Conversation.findOne({
      participants: { $all: [user._id, receiverId] },
    })

    if (!conv) {
      conv = await Conversation.create({
        participants: [user._id, receiverId],
      })
    }

    const message = await Message.create({ conversation: conv._id, sender: user._id, text })
    conv.lastMessage = message._id
    conv.updatedAt = new Date()
    await conv.save()

    const populated = await Message.findById(message._id).populate('sender', 'name school level').lean()
    return res.status(201).json(populated)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
