const Message = require('../../../models/Message')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { senderId, conversationId } = req.body
    if (!senderId && !conversationId) return res.status(400).json({ message: 'senderId or conversationId required' })

    const filter = { read: false }
    if (conversationId) {
      filter.conversation = conversationId
      filter.sender = { $ne: user._id }
    } else {
      filter.sender = senderId
      filter.receiver = user._id
    }

    const result = await Message.updateMany(filter, { read: true })
    res.json({ message: 'Messages marked as read', modifiedCount: result.modifiedCount })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
