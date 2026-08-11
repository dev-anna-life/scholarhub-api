const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')
const { sendNotificationWithEmail } = require('../../../lib/notifications')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { receiverId, text } = req.body
    if (!receiverId || !text) return res.status(400).json({ message: 'receiverId and text required' })

    // Find existing conversation where both users are participants
    const myParticipations = await prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      select: { conversationId: true },
    })
    const myConvIds = myParticipations.map(p => p.conversationId)

    let conv = null
    if (myConvIds.length > 0) {
      const otherParticipation = await prisma.conversationParticipant.findFirst({
        where: { userId: receiverId, conversationId: { in: myConvIds } },
      })
      if (otherParticipation) {
        conv = await prisma.conversation.findUnique({ where: { id: otherParticipation.conversationId } })
      }
    }

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          participants: {
            create: [
              { userId: user.id },
              { userId: receiverId },
            ],
          },
        },
      })
    } else {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      })
    }

    const message = await prisma.message.create({
      data: { conversationId: conv.id, senderId: user.id, text, read: false },
    })

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageId: message.id },
    })

    await sendNotificationWithEmail({
      userId: receiverId,
      fromUserId: user.id,
      type: 'message',
      text: text.substring(0, 200),
    })

    const populated = await prisma.message.findUnique({
      where: { id: message.id },
      include: { sender: { select: { id: true, name: true, username: true, avatar: true } } },
    })

    res.status(201).json(populated)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
