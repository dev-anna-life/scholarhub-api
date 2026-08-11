const prisma = require('../../../../lib/prisma')
const { protect } = require('../../../../lib/auth')

const commentAuthorSelect = { id: true, name: true, username: true, avatar: true, school: true, level: true }

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const post = await prisma.post.findUnique({ where: { id: req.query.id } })
      if (!post) return res.status(404).json({ message: 'Post not found' })

      const comments = await prisma.comment.findMany({
        where: { postId: req.query.id },
        include: { author: { select: commentAuthorSelect } },
        orderBy: { createdAt: 'asc' }
      })
      return res.json(comments)
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      const { text, parentId } = req.body
      if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' })

      const post = await prisma.post.findUnique({ where: { id: req.query.id } })
      if (!post) return res.status(404).json({ message: 'Post not found' })

      const comment = await prisma.comment.create({
        data: {
          text: text.trim(),
          authorId: user.id,
          postId: req.query.id,
          parentId: parentId || null,
        },
        include: { author: { select: commentAuthorSelect } }
      })

      if (parentId) {
        const parentComment = await prisma.comment.findUnique({ where: { id: parentId } })
        if (parentComment && parentComment.authorId !== user.id) {
          await prisma.notification.create({
            data: {
              userId: parentComment.authorId,
              fromUserId: user.id,
              postId: req.query.id,
              type: 'comment',
              text: 'replied to your comment',
            }
          })
        }
      } else if (post.authorId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            fromUserId: user.id,
            postId: req.query.id,
            type: 'comment',
            text: 'commented on your post',
          }
        })
      }

      return res.status(201).json(comment)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
