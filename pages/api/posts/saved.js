const dbConnect = require('../../../lib/db')
const Post = require('../../../models/Post')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return
    const posts = await Post.find({ savedBy: user._id })
      .populate('author', 'name username avatar school faculty department level')
      .sort({ createdAt: -1 })
      .lean()
    const enriched = posts.map(p => ({
      ...p, liked: (p.likes || []).some(l => l.toString() === user._id.toString()),
      saved: true, likesCount: (p.likes || []).length,
    }))
    return res.json(enriched)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
