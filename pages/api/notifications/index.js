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

      // Resolve missing or comment-targeted postId for post notifications
      const userPosts = await prisma.post.findMany({
        where: { authorId: user.id },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      for (const n of notifications) {
        if (n.type !== 'follow' && n.type !== 'message') {
          if (n.postId && n.postId.startsWith('cmt')) {
            const comment = await prisma.comment.findUnique({ where: { id: n.postId }, select: { postId: true } }).catch(() => null)
            if (comment && comment.postId) {
              n.postId = comment.postId
              prisma.notification.update({ where: { id: n.id }, data: { postId: comment.postId } }).catch(() => {})
            }
          } else if (!n.postId && userPosts.length > 0) {
            n.postId = userPosts[0].id
            prisma.notification.update({ where: { id: n.id }, data: { postId: userPosts[0].id } }).catch(() => {})
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
