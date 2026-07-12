const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const admin = await protect(req, res)
    if (!admin) return
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    if (!adminEmails.includes(admin.email?.toLowerCase())) {
      return res.status(403).json({ message: 'Admin only' })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const users = await prisma.user.findMany()
    const results = []

    for (const user of users) {
      const posts = await prisma.post.findMany({
        where: {
          authorId: user.id,
          createdAt: { gte: sevenDaysAgo },
          status: 'approved',
        },
        include: {
          likes: true,
          comments: true,
        }
      })

      let totalEngagement = 0
      for (const post of posts) {
        totalEngagement += post.likes.length + post.comments.length
      }

      if (totalEngagement === 0) continue

      const coinsEarned = totalEngagement * 2
      results.push({ userId: user.id, name: user.name, engagement: totalEngagement, coins: coinsEarned })
    }

    results.sort((a, b) => b.engagement - a.engagement)
    if (results.length > 0) results[0].coins += 200

    for (const r of results) {
      await prisma.user.update({
        where: { id: r.userId },
        data: {
          coins: { increment: r.coins },
          lifetimeCoins: { increment: r.coins },
          monthlyCoins: { increment: r.coins },
          weeklyEngagementCoins: r.coins,
          lastWeeklyPayout: new Date(),
        }
      })
    }

    res.json({ distributed: results.length, results })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
