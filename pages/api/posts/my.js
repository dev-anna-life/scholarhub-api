const Post = require('../../../models/Post')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const posts = await Post.find({ author: user._id }).populate('author', 'name username avatar').sort({ createdAt: -1 }).lean()
    const enriched = posts.map(p => ({
      ...p, liked: (p.likes || []).some(l => l.toString() === user._id.toString()),
      saved: false, likesCount: (p.likes || []).length,
    }))
    res.json(enriched)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
