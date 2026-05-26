const Message = require('../../../models/Message')
const Conversation = require('../../../models/Conversation')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { senderId } = req.body
    if (!senderId) return res.status(400).json({ message: 'senderId required' })

    // Find all conversations for current user
    const allConvs = await Conversation.find({ participants: user._id }).lean()
    const convIds = allConvs.map(c => c._id)

    // Mark all messages in those conversations sent by the specified user as read
    const result = await Message.updateMany(
      {
        conversation: { $in: convIds },
        sender: senderId,
        read: false,
      },
      { read: true }
    )

    res.json({ message: 'Messages marked as read', modifiedCount: result.modifiedCount })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
