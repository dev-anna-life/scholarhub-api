const dbConnect = require('../../../lib/db')
const Post = require('../../../models/Post')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const posts = await Post.find({ savedBy: user._id })
        .populate('author', 'name username avatar school faculty department level')
        .sort({ createdAt: -1 })
        .lean()
      const enriched = posts.map(p => ({
        ...p, liked: (p.likes || []).includes(user._id),
        likesCount: (p.likes || []).length,
        commentCount: (p.commentsData || []).length,
        saved: true,
      }))
      return res.json(enriched)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
