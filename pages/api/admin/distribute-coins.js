const dbConnect = require('../../../lib/db')
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
    await dbConnect()

    const mongoose = require('mongoose')
    const db = mongoose.connection.db
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const users = await db.collection('users').find({}).toArray()
    const results = []

    for (const user of users) {
      const posts = await db.collection('posts').find({
        author: user._id,
        createdAt: { $gte: sevenDaysAgo },
        status: 'approved',
      }).toArray()

      let totalEngagement = 0
      for (const post of posts) {
        totalEngagement += (post.likes?.length || 0) + (post.commentsData?.length || 0)
      }

      if (totalEngagement === 0) continue

      const coinsEarned = totalEngagement * 2
      results.push({ userId: user._id, name: user.name, engagement: totalEngagement, coins: coinsEarned })
    }

    results.sort((a, b) => b.engagement - a.engagement)
    if (results.length > 0) results[0].coins += 200

    for (const r of results) {
      await db.collection('users').updateOne(
        { _id: r.userId },
        {
          $inc: { coins: r.coins, lifetimeCoins: r.coins },
          $set: {
            weeklyEngagementCoins: r.coins,
            lastWeeklyPayout: new Date(),
          },
        }
      )
    }

    res.json({ distributed: results.length, results })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
