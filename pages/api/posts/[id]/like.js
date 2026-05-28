const Post = require('../../../../models/Post')
const Notification = require('../../../../models/Notification')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const post = await Post.findById(req.query.id)
    if (!post) return res.status(404).json({ message: 'Post not found' })

    const idx = post.likes.indexOf(user._id)
    if (idx > -1) post.likes.splice(idx, 1)
    else {
      post.likes.push(user._id)
      if (post.author.toString() !== user._id.toString()) {
        await Notification.create({ user: post.author, fromUser: user._id, type: 'like', text: 'liked your post' })
      }
    }
    await post.save()

    res.json({ likes: post.likes, likesCount: post.likes.length, liked: idx === -1 })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
