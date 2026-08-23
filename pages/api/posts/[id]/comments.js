const prisma = require('../../../../lib/prisma')
const { protect } = require('../../../../lib/auth')
const { sendNotificationWithEmail } = require('../../../../lib/notifications')

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
          await sendNotificationWithEmail({
            userId: parentComment.authorId,
            fromUserId: user.id,
            postId: req.query.id,
            type: 'comment',
            text: 'replied to your comment',
          })
        }
      } else if (post.authorId !== user.id) {
        await sendNotificationWithEmail({
          userId: post.authorId,
          fromUserId: user.id,
          postId: req.query.id,
          type: 'comment',
          text: 'commented on your post',
        })
      }

      // Check for @mentions in comment text
      try {
        const mentionMatches = text.match(/@([a-zA-Z0-9_.]+)/g)
        if (mentionMatches && mentionMatches.length > 0) {
          const handles = Array.from(new Set(mentionMatches.map(m => m.slice(1).toLowerCase())))
          const mentionedUsers = await prisma.user.findMany({
            where: {
              OR: [
                { username: { in: handles, mode: 'insensitive' } },
                { name: { in: handles, mode: 'insensitive' } }
              ],
              id: { not: user.id }
            },
            select: { id: true }
          })

          for (const mUser of mentionedUsers) {
            sendNotificationWithEmail({
              userId: mUser.id,
              fromUserId: user.id,
              postId: req.query.id,
              type: 'mention',
              text: `${user.name} mentioned you in a comment`
            }).catch(() => {})
          }
        }
      } catch (mErr) {
        console.error('Comment mention error:', mErr)
      }

      return res.status(201).json(comment)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
