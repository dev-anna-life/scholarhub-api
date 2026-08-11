const prisma = require('../../lib/prisma')
const { protect } = require('../../lib/auth')
const { sendNotificationWithEmail } = require('../../lib/notifications')

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
    const user = await protect(req, res)
    if (!user || !user.isAdmin) return res.status(403).json({ message: 'Admin access required' })

    const { postId } = req.body
    if (!postId) return res.status(400).json({ message: 'postId is required' })

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: { select: { name: true } } }
    })
    if (!post) return res.status(404).json({ message: 'Post not found' })

    // Fetch active users to notify about trending post
    const users = await prisma.user.findMany({
      where: { NOT: { id: post.authorId } },
      select: { id: true },
      take: 100,
    })

    let sentCount = 0
    for (const u of users) {
      sendNotificationWithEmail({
        userId: u.id,
        fromUserId: post.authorId,
        postId: post.id,
        type: 'trending',
        text: post.title || 'Check out this trending discussion',
      })
      sentCount++
    }

    return res.json({ message: `Trending notifications dispatched to ${sentCount} users`, postId })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
