const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const [followersCount, followingCount, followingRows] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true }
      })
    ])

    const followingIds = followingRows.map(f => f.followingId)
    res.json({ ...user, followersCount, followingCount, followingIds })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
