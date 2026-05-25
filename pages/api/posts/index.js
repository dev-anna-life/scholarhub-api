const dbConnect = require('../../../lib/db')
const Post = require('../../../models/Post')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      await dbConnect()
      const posts = await Post.find({ status: 'approved' }).populate('author', 'name username avatar school level').sort({ createdAt: -1 }).limit(50).lean()
      const enriched = posts.map(p => ({
        ...p, liked: false, saved: false, likesCount: (p.likes || []).length,
      }))
      return res.json(enriched)
    }
    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      const { title, content, category, community, image } = req.body
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })
      const post = await Post.create({ author: user._id, title, content, category: category || '', community: community || '', image: image || '' })
      const populated = await Post.findById(post._id).populate('author', 'name username avatar school level').lean()
      return res.status(201).json({ ...populated, liked: false, saved: false, likesCount: 0 })
    }
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
