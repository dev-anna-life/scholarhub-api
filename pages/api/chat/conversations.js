const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const currentUser = await protect(req, res)
    if (!currentUser) return
    const currentUserId = currentUser.id

    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: currentUserId },
      select: { conversationId: true },
    })
    const convIds = participations.map(p => p.conversationId)

    if (convIds.length === 0) return res.json([])

    const conversations = await prisma.conversation.findMany({
      where: { id: { in: convIds } },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, school: true, level: true, badge: true, username: true, avatar: true },
            },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const unreadCounts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: { conversationId: { in: convIds }, senderId: { not: currentUserId }, read: false },
      _count: { id: true },
    })
    const unreadMap = {}
    for (const item of unreadCounts) {
      unreadMap[item.conversationId] = item._count.id
    }

    const result = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => p.userId !== currentUserId)
      if (!otherParticipant) return null
      return {
        user: otherParticipant.user,
        lastMessage: conv.messages[0] || null,
        unread: unreadMap[conv.id] || 0,
      }
    }).filter(Boolean)

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
