const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

const authorSelect = { id: true, name: true, username: true, avatar: true }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const posts = await prisma.post.findMany({
      where: { authorId: user.id },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const postIds = posts.map(p => p.id)
    const userLikes = postIds.length > 0 ? await prisma.postLike.findMany({
      where: { postId: { in: postIds }, userId: user.id },
      select: { postId: true }
    }) : []
    const likedPostIds = new Set(userLikes.map(l => l.postId))

    const enriched = posts.map(p => {
      const { _count, ...rest } = p
      return {
        ...rest,
        liked: likedPostIds.has(p.id),
        saved: false,
        likesCount: _count.likes,
      }
    })

    res.json(enriched)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
