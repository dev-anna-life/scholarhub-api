const mongoose = require('mongoose')
const Post = require('../../../../models/Post')
const User = require('../../../../models/User')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const post = await Post.findById(req.query.id).populate('commentsData.author', 'name username avatar school level').lean()
      if (!post) return res.status(404).json({ message: 'Post not found' })
      return res.json(post.commentsData || [])
    }
    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      const { text } = req.body
      if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' })
      const post = await Post.findById(req.query.id)
      if (!post) return res.status(404).json({ message: 'Post not found' })
      const comment = { _id: new mongoose.Types.ObjectId(), author: user._id, text, createdAt: new Date() }
      post.commentsData.push(comment)
      await post.save()
      const populated = await Post.findById(post._id).populate('commentsData.author', 'name username avatar school level').lean()
      const newComment = populated.commentsData[populated.commentsData.length - 1]
      return res.status(201).json(newComment)
    }
    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
