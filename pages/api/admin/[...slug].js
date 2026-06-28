const User = require('../../../models/User')
const Post = require('../../../models/Post')
const Message = require('../../../models/Message')
const Conversation = require('../../../models/Conversation')
const Notification = require('../../../models/Notification')
const SOS = require('../../../models/SOS')
const Community = require('../../../models/Community')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const user = await protect(req, res)
    if (!user) return

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    if (!adminEmails.includes(user.email?.toLowerCase())) {
      return res.status(403).json({ message: 'Unauthorized: Admin access only' })
    }

    const [method, ...rest] = req.query.slug || []
    const subpath = rest.join('/')

    if (method === 'stats') {
      if (req.method === 'GET') {
        const totalUsers = await User.countDocuments()
        const totalPosts = await Post.countDocuments()
        const totalCommunities = await Community.countDocuments()
        const activeSos = await SOS.countDocuments({ status: 'active' })
        const recentUsers = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
        
        return res.json({
          totalUsers,
          totalPosts,
          totalCommunities,
          activeSos,
          recentUsers
        })
      }
    }

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
      // --- Deduplicate conversations for same participant pair ---
      const allConvs = await Conversation.find({}).lean()
      const pairMap = {}
      for (const conv of allConvs) {
        const p = conv.participants || []
        if (p.length < 2) continue
        const sorted = p.map(id => id.toString()).sort().join('|')
        if (!pairMap[sorted]) {
          pairMap[sorted] = []
        }
        pairMap[sorted].push(conv)
      }
      const dupIds = []
      const keepMap = {}
      for (const [key, convs] of Object.entries(pairMap)) {
        if (convs.length > 1) {
          convs.sort((a, b) => new Date(b.updatedAt || b._id.getTimestamp()) - new Date(a.updatedAt || a._id.getTimestamp()))
          const keep = convs[0]
          const dups = convs.slice(1).map(c => c._id)
          keepMap[keep._id.toString()] = dups.map(id => id.toString())
          dupIds.push(...dups)
        }
      }
      for (const [keepId, dupIdArr] of Object.entries(keepMap)) {
        await Message.updateMany({ conversation: { $in: dupIdArr } }, { conversation: keepId })
        const latest = await Message.findOne({ conversation: keepId }).sort({ createdAt: -1 }).lean()
        if (latest) await Conversation.findByIdAndUpdate(keepId, { lastMessage: latest._id })
      }
      await Conversation.deleteMany({ _id: { $in: dupIds } })

      // --- Remove orphan conversations (deleted users) ---
      const orphanConvIds = []
      for (const conv of allConvs) {
        if (!conv.participants || conv.participants.length === 0) {
          orphanConvIds.push(conv._id)
          continue
        }
        const validUsers = await User.find({ _id: { $in: conv.participants } }).lean()
        if (validUsers.length < 2) orphanConvIds.push(conv._id)
      }
      const delOrphanConv = await Conversation.deleteMany({ _id: { $in: orphanConvIds } })
      const delOrphanMsg = await Message.deleteMany({ conversation: { $in: orphanConvIds } })

      // --- Remove messages with deleted senders ---
      const allUserIds = (await User.find({}).select('_id').lean()).map(u => u._id)
      const delBadMsg = await Message.deleteMany({
        $and: [
          { $or: [{ sender: { $nin: allUserIds } }, { receiver: { $nin: allUserIds } }] },
          { sender: { $ne: null }, receiver: { $ne: null } },
        ]
      })

      return res.json({
        message: 'Cleanup done',
        deduplicatedConversations: dupIds.length,
        deletedConversations: delOrphanConv.deletedCount,
        deletedMessages: delOrphanMsg.deletedCount + delBadMsg.deletedCount,
      })
    }

    return res.status(404).json({ message: 'Not found' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
