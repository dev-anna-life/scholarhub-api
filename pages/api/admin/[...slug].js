const User = require('../../../models/User')
const Post = require('../../../models/Post')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const user = await protect(req, res)
    if (!user) return

    const [method, ...rest] = req.query.slug || []
    const subpath = rest.join('/')

    if (method === 'users') {
      if (req.method === 'GET') {
        if (subpath) {
          const target = await User.findById(subpath).select('-password').lean()
          if (!target) return res.status(404).json({ message: 'User not found' })
          return res.json(target)
        }
        const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean()
        return res.json(users)
      }
      if (req.method === 'PUT' && subpath) {
        const target = await User.findByIdAndUpdate(subpath, req.body, { new: true }).select('-password')
        if (!target) return res.status(404).json({ message: 'User not found' })
        return res.json(target)
      }
      if (req.method === 'DELETE' && subpath) {
        await User.findByIdAndDelete(subpath)
        return res.json({ message: 'User deleted' })
      }
    }

    if (method === 'posts') {
      if (req.method === 'GET') {
        if (subpath === 'pending') {
          const posts = await Post.find({ status: 'pending' }).populate('author', 'name username avatar').sort({ createdAt: -1 }).lean()
          return res.json(posts)
        }
        const posts = await Post.find({}).populate('author', 'name username avatar').sort({ createdAt: -1 }).lean()
        return res.json(posts)
      }
      if (req.method === 'PUT' && subpath) {
        const [postId, action] = subpath.split('/')
        if (action === 'approve') {
          const post = await Post.findByIdAndUpdate(postId, { status: 'approved' }, { new: true }).populate('author', 'name username avatar')
          if (!post) return res.status(404).json({ message: 'Post not found' })
          return res.json(post)
        }
        if (action === 'reject') {
          const post = await Post.findByIdAndUpdate(postId, { status: 'rejected' }, { new: true }).populate('author', 'name username avatar')
          if (!post) return res.status(404).json({ message: 'Post not found' })
          return res.json(post)
        }
        const post = await Post.findByIdAndUpdate(postId, req.body, { new: true }).populate('author', 'name username avatar')
        if (!post) return res.status(404).json({ message: 'Post not found' })
        return res.json(post)
      }
      if (req.method === 'DELETE' && subpath) {
        const [postId] = subpath.split('/')
        await Post.findByIdAndDelete(postId)
        return res.json({ message: 'Post deleted' })
      }
    }

    return res.status(404).json({ message: 'Not found' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
