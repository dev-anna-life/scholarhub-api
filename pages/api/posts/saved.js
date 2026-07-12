const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

const authorSelect = { id: true, name: true, username: true, avatar: true, school: true, faculty: true, department: true, level: true }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const savedRecords = await prisma.postSave.findMany({
      where: { userId: user.id },
      select: { postId: true }
    })
    const savedPostIds = savedRecords.map(s => s.postId)

    if (savedPostIds.length === 0) return res.json([])

    const posts = await prisma.post.findMany({
      where: { id: { in: savedPostIds } },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const postIds = posts.map(p => p.id)
    const userLikes = await prisma.postLike.findMany({
      where: { postId: { in: postIds }, userId: user.id },
      select: { postId: true }
    })
    const likedPostIds = new Set(userLikes.map(l => l.postId))

    const enriched = posts.map(p => {
      const { _count, ...rest } = p
      return {
        ...rest,
        liked: likedPostIds.has(p.id),
        saved: true,
        likesCount: _count.likes,
      }
    })

    return res.json(enriched)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
