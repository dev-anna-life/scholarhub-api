const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const user = await protect(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const myFollowings = await prisma.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true },
      })
      const followingSet = new Set(myFollowings.map(f => f.followingId))

      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        include: {
          fromUser: { select: { id: true, name: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      const enriched = notifications.map(n => {
        const targetFromId = n.fromUserId || n.fromUser?.id
        const isFollowing = targetFromId ? followingSet.has(targetFromId) : false
        return {
          ...n,
          isFollowing,
          fromUser: n.fromUser ? {
            ...n.fromUser,
            isFollowing,
          } : null,
        }
      })

      return res.json(enriched)
    }

    if (req.method === 'POST') {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      })
      return res.json({ message: 'Notifications marked as read' })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
