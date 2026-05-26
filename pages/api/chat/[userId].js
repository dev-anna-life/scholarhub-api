const Message = require('../../../models/Message')
const Conversation = require('../../../models/Conversation')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { userId } = req.query
    if (!userId) return res.status(400).json({ message: 'userId required' })

    // Find all conversations for current user, then find the one with the other participant
    const allConvs = await Conversation.find({ participants: user._id }).lean()
    let conv = allConvs.find(c =>
      c.participants && c.participants.some(p => p.toString() === userId)
    )

    if (!conv) {
      conv = await Conversation.create({
        participants: [user._id, userId],
      })
      conv = conv.toObject()
    }

    const messages = await Message.find({ conversation: conv._id })
      .populate('sender', 'name school level')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    // Mark messages from the other user as read
    await Message.updateMany(
      { conversation: conv._id, sender: { $ne: user._id }, read: false },
      { read: true }
    )

    return res.json(messages.reverse())
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
