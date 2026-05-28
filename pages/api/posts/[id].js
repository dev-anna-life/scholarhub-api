const dbConnect = require('../../../lib/db')
const Post = require('../../../models/Post')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    await dbConnect()

    if (req.method === 'GET') {
      const post = await Post.findById(req.query.id).populate('author', 'name username avatar school level').lean()
      if (!post) return res.status(404).json({ message: 'Post not found' })
      const commentsWithAuthors = await Post.populate(post, { path: 'commentsData.author', select: 'name username avatar' })
      return res.json({ ...post, liked: false, saved: false, likesCount: (post.likes || []).length, commentsData: commentsWithAuthors.commentsData || [] })
    }

    if (req.method === 'DELETE') {
      const user = await protect(req, res)
      if (!user) return
      const post = await Post.findById(req.query.id)
      if (!post) return res.status(404).json({ message: 'Post not found' })
      if (post.author.toString() !== user._id.toString()) return res.status(403).json({ message: 'Not authorized' })
      await Post.findByIdAndDelete(post._id)
      return res.json({ message: 'Post deleted' })
    }
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
