const dbConnect = require('../../../lib/db')
const { protect } = require('../../../lib/auth')
const MonthlyAward = require('../../../models/MonthlyAward')

export default async function handler(req, res) {
  try {
    const admin = await protect(req, res)
    if (!admin) return
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    if (!adminEmails.includes(admin.email?.toLowerCase())) {
      return res.status(403).json({ message: 'Admin only' })
    }
    await dbConnect()

    if (req.method === 'POST') {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const startOfMonth = new Date(year, now.getMonth(), 1)
      const endOfMonth = new Date(year, now.getMonth() + 1, 1)

      const mongoose = require('mongoose')
      const db = mongoose.connection.db
      const categories = ['educational', 'meme', 'news']
      const labels = {
        educational: 'Highest Educational Content of the Month',
        meme: 'Highest Educational Meme of the Month',
        news: 'Highest News Broadcaster of the Month',
      }

      const created = []

      for (const category of categories) {
        const posts = await db.collection('posts').aggregate([
          { $match: { category, status: 'approved', createdAt: { $gte: startOfMonth, $lt: endOfMonth } } },
          {
            $addFields: {
              engagementScore: {
                $add: [{ $size: { $ifNull: ['$likes', []] } }, { $size: { $ifNull: ['$commentsData', []] } }],
              },
            },
          },
          { $sort: { engagementScore: -1 } },
          { $limit: 1 },
        ]).toArray()

        if (posts.length === 0) continue

        const top = posts[0]
        await MonthlyAward.findOneAndUpdate(
          { month, year, category },
          {
            category,
            post: top._id,
            user: top.author,
            month,
            year,
            engagementScore: top.engagementScore || 0,
            label: labels[category],
          },
          { upsert: true, new: true }
        )

        created.push({ category, engagementScore: top.engagementScore || 0, postId: top._id, authorId: top.author })
      }

      return res.json({ month, year, created })
    }

    if (req.method === 'GET') {
      const now = new Date()
      const month = parseInt(req.query.month) || now.getMonth() + 1
      const year = parseInt(req.query.year) || now.getFullYear()

      const awards = await MonthlyAward.find({ month, year })
        .populate('user', 'name school level badge')
        .populate('post', 'title content image')
        .lean()

      return res.json(awards)
    }

    res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
