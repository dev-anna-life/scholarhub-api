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

      let notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        include: {
          fromUser: { select: { id: true, name: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      // Resolve missing postId for post-related notifications (like, comment)
      const missingPostNotifs = notifications.filter(n => (n.type === 'like' || n.type === 'comment') && !n.postId)
      if (missingPostNotifs.length > 0) {
        const userPosts = await prisma.post.findMany({
          where: { authorId: user.id },
          select: { id: true, title: true, content: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
        
        if (userPosts.length > 0) {
          const defaultPostId = userPosts[0].id
          for (const n of missingPostNotifs) {
            n.postId = defaultPostId
            prisma.notification.update({
              where: { id: n.id },
              data: { postId: defaultPostId }
            }).catch(() => {})
          }
        }
      }

      // Collect all postIds to fetch post titles & details
      const postIds = notifications.map(n => n.postId).filter(Boolean)
      const postsMap = {}
      if (postIds.length > 0) {
        const posts = await prisma.post.findMany({
          where: { id: { in: postIds } },
          select: { id: true, title: true, content: true }
        })
        for (const p of posts) postsMap[p.id] = p
      }

      const enriched = notifications.map(n => {
        const targetFromId = n.fromUserId || n.fromUser?.id
        const isFollowing = targetFromId ? followingSet.has(targetFromId) : false
        return {
          ...n,
          isFollowing,
          post: n.postId ? postsMap[n.postId] || null : null,
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
