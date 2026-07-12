const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { senderId } = req.body
    if (!senderId) return res.status(400).json({ message: 'senderId required' })

    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      select: { conversationId: true },
    })
    const convIds = participations.map(p => p.conversationId)

    const result = await prisma.message.updateMany({
      where: {
        conversationId: { in: convIds },
        senderId,
        read: false,
      },
      data: { read: true },
    })

    res.json({ message: 'Messages marked as read', modifiedCount: result.count })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
