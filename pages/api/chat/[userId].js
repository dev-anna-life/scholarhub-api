const Message = require('../../../models/Message')
const Conversation = require('../../../models/Conversation')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { userId } = req.query

    let conv = await Conversation.findOne({
      participants: { $all: [user._id, userId] },
    })

    if (!conv) {
      conv = await Conversation.create({
        participants: [user._id, userId],
      })
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
