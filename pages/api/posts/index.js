const dbConnect = require('../../../lib/db')
const Post = require('../../../models/Post')
const User = require('../../../models/User')
const Community = require('../../../models/Community')
const Notification = require('../../../models/Notification')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      await dbConnect()
      const { community } = req.query
      const filter = { status: 'approved' }
      if (community) filter.communities = community
      const posts = await Post.find(filter)
        .populate('author', 'name username avatar school faculty department level')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
      const enriched = posts.map(p => ({
        ...p, liked: false, saved: false, likesCount: (p.likes || []).length,
      }))
      return res.json(enriched)
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      const { title, content, category, image, communityIds } = req.body
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })

      let finalCommunityIds = communityIds || []

      if (!finalCommunityIds.length && user.school && user.department && user.faculty) {
        const deptCom = await Community.findOne({
          type: 'department', school: user.school,
          faculty: user.faculty, department: user.department
        })
        if (deptCom) finalCommunityIds = [deptCom._id]
      }

      const post = await Post.create({
        author: user._id, title, content,
        category: category || '', image: image || '',
        communities: finalCommunityIds,
      })

      const communities = await Community.find({ _id: { $in: finalCommunityIds } }).lean()
      for (const com of communities) {
        const members = await User.find({ _id: { $ne: user._id, $in: com.members } }).select('_id').lean()
        if (members.length > 0) {
          const notifs = members.map(u => ({
            user: u._id, fromUser: user._id,
            type: 'post',
            text: `${user.name.split(' ')[0]} posted in ${com.name}`,
          }))
          await Notification.insertMany(notifs)
        }
      }

      const populated = await Post.findById(post._id).populate('author', 'name username avatar school faculty department level').lean()
      return res.status(201).json({ ...populated, liked: false, saved: false, likesCount: 0 })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
