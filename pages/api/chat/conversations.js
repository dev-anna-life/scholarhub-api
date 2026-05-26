const dbConnect = require('../../../lib/db')
const mongoose = require('mongoose')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const currentUser = await protect(req, res)
    if (!currentUser) return
    const currentUserId = currentUser._id.toString()
    await dbConnect()

    const db = mongoose.connection.db
    const userIdObj = new mongoose.Types.ObjectId(currentUserId)

    // Get all conversations for this user using raw driver
    const convs = await db.collection('conversations')
      .find({ participants: userIdObj })
      .sort({ updatedAt: -1 })
      .toArray()

    // Build result with user info
    const result = []
    for (const conv of convs) {
      const otherId = conv.participants?.find(p => p.toString() !== currentUserId)
      if (!otherId) continue
      const otherUser = await db.collection('users')
        .findOne({ _id: otherId }, { projection: { name: 1, school: 1, level: 1, badge: 1, _id: 1 } })
      if (!otherUser) continue

      let lastMessage = null
      if (conv.lastMessage) {
        const msgs = await db.collection('messages')
          .find({ _id: conv.lastMessage })
          .limit(1)
          .toArray()
        if (msgs.length > 0) lastMessage = msgs[0]
      }

      result.push({
        user: otherUser,
        lastMessage,
        unread: 0,
      })
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
