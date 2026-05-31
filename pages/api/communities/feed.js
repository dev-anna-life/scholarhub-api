const dbConnect = require('../../../lib/db')
const Post = require('../../../models/Post')
const Community = require('../../../models/Community')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    if (!user.school) return res.json([])

    const generalHub = await Community.findOne({ type: 'general', school: { $exists: false } }).lean()

    const myCommunities = await Community.find({ members: user._id }).lean()
    const myCommunityIds = myCommunities.map(c => c._id)

    const userDeptCommunity = myCommunities.find(c => c.type === 'department' && c.school === user.school && c.department === user.department)
    const userFacultyCommunity = myCommunities.find(c => c.type === 'faculty' && c.school === user.school && c.faculty === user.faculty)
    const userSchoolCommunity = myCommunities.find(c => c.type === 'school' && c.school === user.school)

    const cascadeOrder = []

    if (userDeptCommunity) {
      const deptPosts = await Post.find({
        status: 'approved',
        $or: [
          { community: userDeptCommunity._id, visibility: 'department' },
          { community: userDeptCommunity._id, visibility: 'faculty' },
        ]
      }).populate('author', 'name username avatar school faculty department level').sort({ createdAt: -1 }).limit(20).lean()
      cascadeOrder.push({ type: 'department', community: userDeptCommunity.name, posts: deptPosts.map(p => ({ ...p, liked: p.likes?.includes(user._id) || false, likesCount: (p.likes || []).length })) })
    }

    const deptIds = myCommunities.filter(c => c.type === 'department').map(c => c._id)
    const facultyIds = myCommunities.filter(c => c.type === 'faculty').map(c => c._id)
    const schoolIds = myCommunities.filter(c => c.type === 'school').map(c => c._id)
    
    const generalIds = myCommunities.filter(c => c.type === 'general').map(c => c._id)
    if (generalHub) generalIds.push(generalHub._id)

    const userDeptPosts = cascadeOrder[0]?.posts || []

    if (userDeptPosts.length < 20) {
      const existingIds = userDeptPosts.map(p => p._id.toString())
      const facultyPosts = await Post.find({
        status: 'approved',
        _id: { $nin: existingIds },
        $or: [
          { community: { $in: facultyIds.filter(id => !deptIds.includes(id)) } },
          { community: { $in: myCommunityIds }, visibility: 'faculty' },
        ]
      }).populate('author', 'name username avatar school faculty department level').sort({ createdAt: -1 }).limit(20 - userDeptPosts.length).lean()
      cascadeOrder.push({ type: 'faculty', posts: facultyPosts.map(p => ({ ...p, liked: p.likes?.includes(user._id) || false, likesCount: (p.likes || []).length })) })
    }

    return res.json(cascadeOrder)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
