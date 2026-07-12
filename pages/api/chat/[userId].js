const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const myId = user.id
    const { userId: otherId } = req.query
    if (!otherId) return res.status(400).json({ message: 'userId required' })

    // Find conversation where both are participants
    const myParticipations = await prisma.conversationParticipant.findMany({
      where: { userId: myId },
      select: { conversationId: true },
    })
    const myConvIds = myParticipations.map(p => p.conversationId)

    let conv = null
    if (myConvIds.length > 0) {
      const otherParticipation = await prisma.conversationParticipant.findFirst({
        where: { userId: otherId, conversationId: { in: myConvIds } },
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
              { userId: myId },
              { userId: otherId },
            ],
          },
        },
      })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sender: { select: { id: true, name: true, username: true, avatar: true } } },
    })

    await prisma.message.updateMany({
      where: { conversationId: conv.id, senderId: { not: myId }, read: false },
      data: { read: true },
    })

    res.json(messages.reverse())
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
