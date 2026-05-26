const dbConnect = require('../../../lib/db')
const mongoose = require('mongoose')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    await dbConnect()
    const db = mongoose.connection.db

    const myId = user._id.toString()
    const { userId: otherId } = req.query
    if (!otherId) return res.status(400).json({ message: 'userId required' })

    const myOid = new mongoose.Types.ObjectId(myId)
    const otherOid = new mongoose.Types.ObjectId(otherId)

    // Find conversation where both are participants (raw driver)
    const convs = await db.collection('conversations')
      .find({ participants: { $size: 2 } })
      .toArray()
    let conv = convs.find(c =>
      c.participants && c.participants.length === 2 &&
      c.participants.some(p => p.equals(myOid)) &&
      c.participants.some(p => p.equals(otherOid))
    )

    if (!conv) {
      const insertResult = await db.collection('conversations').insertOne({
        participants: [myOid, otherOid],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      conv = { _id: insertResult.insertedId, participants: [myOid, otherOid] }
    }

    // Get messages with sender info
    const messages = await db.collection('messages')
      .aggregate([
        { $match: { conversation: conv._id } },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
        { $lookup: { from: 'users', localField: 'sender', foreignField: '_id', as: 'sender' } },
        { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } },
        { $project: { 'sender.password': 0, 'sender.email': 0 } },
        { $sort: { createdAt: 1 } },
      ])
      .toArray()

    // Mark messages from other user as read
    await db.collection('messages').updateMany(
      { conversation: conv._id, sender: { $ne: myOid }, read: { $ne: true } },
      { $set: { read: true } }
    )

    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
