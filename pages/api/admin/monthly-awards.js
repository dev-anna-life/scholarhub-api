const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const admin = await protect(req, res)
    if (!admin) return
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    if (!adminEmails.includes(admin.email?.toLowerCase())) {
      return res.status(403).json({ message: 'Admin only' })
    }

    if (req.method === 'POST') {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const startOfMonth = new Date(year, now.getMonth(), 1)
      const endOfMonth = new Date(year, now.getMonth() + 1, 1)

      const categories = ['educational', 'meme', 'news']
      const labels = {
        educational: 'Highest Educational Content of the Month',
        meme: 'Highest Educational Meme of the Month',
        news: 'Highest News Broadcaster of the Month',
      }

      const created = []

      for (const category of categories) {
        const posts = await prisma.post.findMany({
          where: {
            category,
            status: 'approved',
            createdAt: { gte: startOfMonth, lt: endOfMonth },
          },
          include: {
            likes: true,
            comments: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        const postsWithScore = posts.map(p => ({
          ...p,
          engagementScore: p.likes.length + p.comments.length,
        })).sort((a, b) => b.engagementScore - a.engagementScore)

        if (postsWithScore.length === 0) continue

        const top = postsWithScore[0]
        const award = await prisma.monthlyAward.upsert({
          where: { month_year_category: { month, year, category } },
          create: {
            category,
            postId: top.id,
            userId: top.authorId,
            month,
            year,
            engagementScore: top.engagementScore || 0,
            label: labels[category],
          },
          update: {
            postId: top.id,
            userId: top.authorId,
            engagementScore: top.engagementScore || 0,
            label: labels[category],
          },
        })

        created.push({ category, engagementScore: top.engagementScore || 0, postId: top.id, authorId: top.authorId })
      }

      return res.json({ month, year, created })
    }

    if (req.method === 'GET') {
      const now = new Date()
      const month = parseInt(req.query.month) || now.getMonth() + 1
      const year = parseInt(req.query.year) || now.getFullYear()

      const awards = await prisma.monthlyAward.findMany({
        where: { month, year },
        include: {
          user: { select: { name: true, school: true, level: true, badge: true } },
          post: { select: { title: true, content: true, image: true } },
        },
      })

      return res.json(awards)
    }

    res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
