const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const user = await protect(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const conversationId = req.query.id
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { sender: { select: { id: true, name: true, username: true, avatar: true } } },
      })
      return res.json(messages.reverse())
    }

    if (req.method === 'POST') {
      const { conversationId, text } = req.body
      if (!conversationId || !text) return res.status(400).json({ message: 'conversationId and text required' })

      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
      if (!conv) return res.status(404).json({ message: 'Conversation not found' })

      const isParticipant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: user.id } },
      })
      if (!isParticipant) return res.status(403).json({ message: 'Not a participant' })

      const message = await prisma.message.create({
        data: { conversationId, senderId: user.id, text },
      })

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageId: message.id, updatedAt: new Date() },
      })

      const populated = await prisma.message.findUnique({
        where: { id: message.id },
        include: { sender: { select: { id: true, name: true, username: true, avatar: true } } },
      })
      return res.status(201).json(populated)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
