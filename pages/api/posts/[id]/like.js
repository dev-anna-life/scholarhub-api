const prisma = require('../../../../lib/prisma')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const post = await prisma.post.findUnique({ where: { id: req.query.id } })
    if (!post) return res.status(404).json({ message: 'Post not found' })

    const existingLike = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: req.query.id, userId: user.id } }
    })

    if (existingLike) {
      await prisma.postLike.delete({
        where: { postId_userId: { postId: req.query.id, userId: user.id } }
      })
    } else {
      await prisma.postLike.create({
        data: { postId: req.query.id, userId: user.id }
      })
      if (post.authorId !== user.id) {
        await prisma.notification.create({
          data: { userId: post.authorId, fromUserId: user.id, type: 'like', text: 'liked your post' }
        })
      }
    }

    const likesCount = await prisma.postLike.count({ where: { postId: req.query.id } })

    res.json({ likesCount, liked: !existingLike })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
