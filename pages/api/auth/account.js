const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return
    await prisma.notification.deleteMany({ where: { OR: [{ userId: user.id }, { fromUserId: user.id }] } })
    await prisma.post.deleteMany({ where: { authorId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    res.json({ message: 'Account deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
