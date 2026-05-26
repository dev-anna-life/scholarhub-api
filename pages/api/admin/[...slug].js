const User = require('../../../models/User')
const Post = require('../../../models/Post')
const Message = require('../../../models/Message')
const Conversation = require('../../../models/Conversation')
const Notification = require('../../../models/Notification')
const SOS = require('../../../models/SOS')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
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
        const [userId] = subpath.split('/')
        await Post.deleteMany({ author: userId })
        await Message.deleteMany({ sender: userId })
        await Conversation.deleteMany({ participants: userId })
        await Notification.deleteMany({ $or: [{ user: userId }, { fromUser: userId }] })
        await SOS.deleteMany({ student: userId })
        await User.updateMany(
          { $or: [{ followers: userId }, { following: userId }] },
          { $pull: { followers: userId, following: userId } },
        )
        await User.findByIdAndDelete(userId)
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

    if (method === 'cleanup') {
      // Delete conversations with no valid participants
      const allConvs = await Conversation.find({}).lean()
      const badConvIds = []
      for (const conv of allConvs) {
        if (!conv.participants || conv.participants.length === 0) {
          badConvIds.push(conv._id)
          continue
        }
        const validUsers = await User.find({ _id: { $in: conv.participants } }).lean()
        if (validUsers.length < 2) {
          badConvIds.push(conv._id)
        }
      }
      const delConv = await Conversation.deleteMany({ _id: { $in: badConvIds } })
      const delMsg = await Message.deleteMany({ conversation: { $in: badConvIds } })
      return res.json({
        message: 'Cleanup done',
        deletedConversations: delConv.deletedCount,
        deletedMessages: delMsg.deletedCount,
      })
    }

    return res.status(404).json({ message: 'Not found' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
