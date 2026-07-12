const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const user = await protect(req, res)
    if (!user) return

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    if (!adminEmails.includes(user.email?.toLowerCase())) {
      return res.status(403).json({ message: 'Unauthorized: Admin access only' })
    }

    const [method, ...rest] = req.query.slug || []
    const subpath = rest.join('/')

    if (method === 'stats') {
      if (req.method === 'GET') {
        const totalUsers = await prisma.user.count()
        const totalPosts = await prisma.post.count()
        const totalCommunities = await prisma.community.count()
        const activeSos = await prisma.sOS.count({ where: { status: 'active' } })
        const recentUsers = await prisma.user.count({
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        })
        
        return res.json({
          totalUsers,
          totalPosts,
          totalCommunities,
          activeSos,
          recentUsers
        })
      }
    }

    if (method === 'users') {
      if (req.method === 'GET') {
        if (subpath) {
          const target = await prisma.user.findUnique({ where: { id: subpath } })
          if (!target) return res.status(404).json({ message: 'User not found' })
          const { password, ...userWithoutPassword } = target
          return res.json(userWithoutPassword)
        }
        const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
        const safeUsers = users.map(({ password, ...rest }) => rest)
        return res.json(safeUsers)
      }
      if (req.method === 'PUT' && subpath) {
        const target = await prisma.user.update({ where: { id: subpath }, data: req.body })
        if (!target) return res.status(404).json({ message: 'User not found' })
        const { password, ...userWithoutPassword } = target
        return res.json(userWithoutPassword)
      }
      if (req.method === 'DELETE' && subpath) {
        const [userId] = subpath.split('/')
        await prisma.post.deleteMany({ where: { authorId: userId } })
        await prisma.message.deleteMany({ where: { senderId: userId } })
        await prisma.conversationParticipant.deleteMany({ where: { userId } })
        await prisma.conversation.deleteMany({
          where: { participants: { none: {} } }
        })
        await prisma.notification.deleteMany({ where: { OR: [{ userId }, { fromUserId: userId }] } })
        await prisma.sOS.deleteMany({ where: { studentId: userId } })
        await prisma.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } })
        await prisma.user.delete({ where: { id: userId } })
        return res.json({ message: 'User deleted' })
      }
    }

    if (method === 'posts') {
      if (req.method === 'GET') {
        if (subpath === 'pending') {
          const posts = await prisma.post.findMany({
            where: { status: 'pending' },
            include: { author: { select: { name: true, username: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
          })
          return res.json(posts)
        }
        const posts = await prisma.post.findMany({
          include: { author: { select: { name: true, username: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        })
        return res.json(posts)
      }
      if (req.method === 'PUT' && subpath) {
        const [postId, action] = subpath.split('/')
        if (action === 'approve') {
          const post = await prisma.post.update({
            where: { id: postId },
            data: { status: 'approved' },
            include: { author: { select: { name: true, username: true, avatar: true } } },
          })
          if (!post) return res.status(404).json({ message: 'Post not found' })
          return res.json(post)
        }
        if (action === 'reject') {
          const post = await prisma.post.update({
            where: { id: postId },
            data: { status: 'rejected' },
            include: { author: { select: { name: true, username: true, avatar: true } } },
          })
          if (!post) return res.status(404).json({ message: 'Post not found' })
          return res.json(post)
        }
        const post = await prisma.post.update({
          where: { id: postId },
          data: req.body,
          include: { author: { select: { name: true, username: true, avatar: true } } },
        })
        if (!post) return res.status(404).json({ message: 'Post not found' })
        return res.json(post)
      }
      if (req.method === 'DELETE' && subpath) {
        const [postId] = subpath.split('/')
        await prisma.post.delete({ where: { id: postId } })
        return res.json({ message: 'Post deleted' })
      }
    }

    if (method === 'cleanup') {
      const allConvs = await prisma.conversation.findMany({ include: { participants: true } })
      const pairMap = {}
      for (const conv of allConvs) {
        const p = conv.participants || []
        if (p.length < 2) continue
        const sorted = p.map(part => part.userId).sort().join('|')
        if (!pairMap[sorted]) pairMap[sorted] = []
        pairMap[sorted].push(conv)
      }
      const dupIds = []
      const keepMap = {}
      for (const [key, convs] of Object.entries(pairMap)) {
        if (convs.length > 1) {
          convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          const keep = convs[0]
          const dups = convs.slice(1).map(c => c.id)
          keepMap[keep.id] = dups
          dupIds.push(...dups)
        }
      }
      for (const [keepId, dupIdArr] of Object.entries(keepMap)) {
        await prisma.message.updateMany({ where: { conversationId: { in: dupIdArr } }, data: { conversationId: keepId } })
        const latest = await prisma.message.findFirst({ where: { conversationId: keepId }, orderBy: { createdAt: 'desc' } })
        if (latest) await prisma.conversation.update({ where: { id: keepId }, data: { lastMessageId: latest.id } })
      }
      await prisma.conversation.deleteMany({ where: { id: { in: dupIds } } })

      const orphanConvIds = []
      for (const conv of allConvs) {
        if (!conv.participants || conv.participants.length === 0) {
          orphanConvIds.push(conv.id)
          continue
        }
        const validUsers = await prisma.user.findMany({ where: { id: { in: conv.participants.map(p => p.userId) } } })
        if (validUsers.length < 2) orphanConvIds.push(conv.id)
      }
      const delOrphanConv = await prisma.conversation.deleteMany({ where: { id: { in: orphanConvIds } } })
      const delOrphanMsg = await prisma.message.deleteMany({ where: { conversationId: { in: orphanConvIds } } })

      const allUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id)
      const delBadMsg = await prisma.message.deleteMany({
        where: {
          senderId: { notIn: allUserIds }
        }
      })

      return res.json({
        message: 'Cleanup done',
        deduplicatedConversations: dupIds.length,
        deletedConversations: delOrphanConv.count,
        deletedMessages: delOrphanMsg.count + delBadMsg.count,
      })
    }

    return res.status(404).json({ message: 'Not found' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
