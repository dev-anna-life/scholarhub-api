const dbConnect = require('../../../lib/db')
const mongoose = require('mongoose')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    await dbConnect()
    const db = mongoose.connection.db

    const { receiverId, text } = req.body
    if (!receiverId || !text) return res.status(400).json({ message: 'receiverId and text required' })

    const myOid = new mongoose.Types.ObjectId(user._id.toString())
    const recvOid = new mongoose.Types.ObjectId(receiverId)

    // Find existing conversation (raw driver)
    const convs = await db.collection('conversations')
      .find({ participants: { $size: 2 } })
      .toArray()
    let conv = convs.find(c =>
      c.participants && c.participants.length === 2 &&
      c.participants.some(p => p.equals(myOid)) &&
      c.participants.some(p => p.equals(recvOid))
    )

    if (!conv) {
      const insertResult = await db.collection('conversations').insertOne({
        participants: [myOid, recvOid],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      conv = { _id: insertResult.insertedId }
    } else {
      await db.collection('conversations').updateOne(
        { _id: conv._id },
        { $set: { updatedAt: new Date() } }
      )
    }

    // Create message
    const msgResult = await db.collection('messages').insertOne({
      conversation: conv._id,
      sender: myOid,
      text,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const messageId = msgResult.insertedId

    // Update lastMessage on conversation
    await db.collection('conversations').updateOne(
      { _id: conv._id },
      { $set: { lastMessage: messageId } }
    )

    // Create notification for receiver
    await db.collection('notifications').insertOne({
      user: recvOid,
      fromUser: myOid,
      type: 'message',
      text: text.substring(0, 200),
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Return populated message
    const populated = await db.collection('messages')
      .aggregate([
        { $match: { _id: messageId } },
        { $lookup: { from: 'users', localField: 'sender', foreignField: '_id', as: 'sender' } },
        { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } },
        { $project: { 'sender.password': 0, 'sender.email': 0 } },
      ])
      .toArray()

    res.status(201).json(populated[0])
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
