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
      const { visibility, community } = req.query
      const filter = { status: 'approved' }
      if (visibility) filter.visibility = visibility
      if (community) filter.community = community
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
      const { title, content, category, image, visibility, community } = req.body
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })

      const finalVisibility = visibility || 'department'

      let communityId = community
      const userLevel = (user.level || '').toLowerCase()

      if (finalVisibility === 'department' && user.school && user.department && user.faculty) {
        const deptCom = await Community.findOne({
          type: 'department', school: user.school,
          faculty: user.faculty, department: user.department
        })
        if (deptCom) communityId = deptCom._id
      } else if (finalVisibility === 'faculty' && user.school && user.faculty) {
        const facCom = await Community.findOne({
          type: 'faculty', school: user.school, faculty: user.faculty
        })
        if (facCom) communityId = facCom._id
      } else if (finalVisibility === 'school' && user.school) {
        const schCom = await Community.findOne({ type: 'school', school: user.school })
        if (schCom) communityId = schCom._id
      } else if (finalVisibility === 'general') {
        const generalCom = await Community.findOne({
          type: 'general',
          name: userLevel === 'secondary' ? 'General Secondary Hub' : 'General University Hub'
        })
        if (generalCom) communityId = generalCom._id
      }

      const post = await Post.create({
        author: user._id, title, content,
        category: category || '', image: image || '',
        visibility: finalVisibility,
        community: communityId || undefined,
      })

      if (finalVisibility === 'school' && user.school) {
        const schoolUsers = await User.find({ school: user.school, _id: { $ne: user._id } }).select('_id').lean()
        if (schoolUsers.length > 0) {
          const notifs = schoolUsers.map(u => ({
            user: u._id, fromUser: user._id,
            type: 'post',
            text: `${user.name.split(' ')[0]} posted in ${user.school}`,
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
