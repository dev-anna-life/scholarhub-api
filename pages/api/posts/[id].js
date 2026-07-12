const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

const authorSelect = { id: true, name: true, username: true, avatar: true, school: true, level: true }
const commentAuthorSelect = { id: true, name: true, username: true, avatar: true }

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const post = await prisma.post.findUnique({
        where: { id: req.query.id },
        include: {
          author: { select: authorSelect },
          comments: {
            include: { author: { select: commentAuthorSelect } },
            orderBy: { createdAt: 'asc' }
          },
          _count: { select: { likes: true } }
        }
      })
      if (!post) return res.status(404).json({ message: 'Post not found' })
      const { _count, comments, ...rest } = post
      return res.json({ ...rest, liked: false, saved: false, likesCount: _count.likes, commentsData: comments || [] })
    }

    if (req.method === 'DELETE') {
      const user = await protect(req, res)
      if (!user) return
      const post = await prisma.post.findUnique({ where: { id: req.query.id } })
      if (!post) return res.status(404).json({ message: 'Post not found' })
      if (post.authorId !== user.id) return res.status(403).json({ message: 'Not authorized' })
      await prisma.post.delete({ where: { id: req.query.id } })
      return res.json({ message: 'Post deleted' })
    }
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
