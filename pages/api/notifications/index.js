const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const user = await protect(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        include: {
          fromUser: { select: { id: true, name: true, username: true, avatar: true } },
          post: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return res.json(notifications)
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
