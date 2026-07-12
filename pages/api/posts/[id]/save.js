const prisma = require('../../../../lib/prisma')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const post = await prisma.post.findUnique({ where: { id: req.query.id } })
    if (!post) return res.status(404).json({ message: 'Post not found' })

    const existingSave = await prisma.postSave.findUnique({
      where: { postId_userId: { postId: req.query.id, userId: user.id } }
    })

    if (existingSave) {
      await prisma.postSave.delete({
        where: { postId_userId: { postId: req.query.id, userId: user.id } }
      })
    } else {
      await prisma.postSave.create({
        data: { postId: req.query.id, userId: user.id }
      })
    }

    res.json({ message: existingSave ? 'Post removed from saved' : 'Post saved successfully', saved: !existingSave })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
