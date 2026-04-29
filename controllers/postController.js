const Post = require('../models/Post')

const createPost = async (req, res) => {
    try {
        const { title, content, category } = req.body

        if (!title || !content || !category) {
            return res.status(400).json({ message: 'Title, content and category are required' })
        }

        const post = await Post.create({
            author: req.user.id,
            title,
            content,
            category,
            status: 'pending'
        })

        res.status(201).json({
            message: 'Post submitted for review successfully',
            post
        })
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}

const getPosts = async (req, res) => {
    try {
        const posts = await Post.find({ status: 'approved' })
        .populate('author', 'name level school badge')
        .sort({ createdAt: -1 })
        
        res.json(posts)
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}

const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id }).sort({ createdAt: -1 })
    res.json(posts)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
module.exports = { createPost, getPosts, getMyPosts }