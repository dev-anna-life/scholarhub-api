const dbConnect = require('../../../../lib/db')
const Post = require('../../../../models/Post')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const post = await Post.findById(req.query.id)
    if (!post) return res.status(404).json({ message: 'Post not found' })

    if (req.method === 'POST') {
      const idx = post.savedBy.indexOf(user._id)
      if (idx === -1) {
        post.savedBy.push(user._id)
        await post.save()
        return res.json({ saved: true })
      }
      post.savedBy.splice(idx, 1)
      await post.save()
      return res.json({ saved: false })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
