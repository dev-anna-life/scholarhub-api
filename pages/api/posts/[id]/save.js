const dbConnect = require('../../../../lib/db')
const Post = require('../../../../models/Post')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const post = await Post.findById(req.query.id)
    if (!post) return res.status(404).json({ message: 'Post not found' })

    const hasSaved = post.savedBy.includes(user._id)
    if (hasSaved) {
      post.savedBy = post.savedBy.filter(id => id.toString() !== user._id.toString())
    } else {
      post.savedBy.push(user._id)
    }

    await post.save()
    res.json({ message: hasSaved ? 'Post removed from saved' : 'Post saved successfully', saved: !hasSaved })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
