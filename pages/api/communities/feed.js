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

    const myCommunities = await Community.find({ members: user._id }).lean()
    if (!myCommunities.length) return res.json([])

    const userDeptCom = myCommunities.find(c => c.type === 'department' && c.school === user.school && c.department === user.department)
    const userFacultyComs = myCommunities.filter(c => c.type === 'faculty' && c.school === user.school)
    const userSchoolComs = myCommunities.filter(c => c.type === 'school' && c.school === user.school)
    const userGeneralComs = myCommunities.filter(c => c.type === 'general')

    const cascadeOrder = []
    let seenIds = []

    const fetchPosts = async (communities, limit) => {
      if (!communities.length || limit <= 0) return []
      const posts = await Post.find({
        status: 'approved',
        _id: { $nin: seenIds },
        communities: { $in: communities.map(c => c._id) }
      })
        .populate('author', 'name username avatar school faculty department level')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
      seenIds = [...seenIds, ...posts.map(p => p._id.toString())]
      return posts.map(p => ({ ...p, liked: p.likes?.includes(user._id) || false, likesCount: (p.likes || []).length }))
    }

    const deptPosts = await fetchPosts(userDeptCom ? [userDeptCom] : [], 20)
    if (deptPosts.length) cascadeOrder.push({ type: 'department', community: userDeptCom?.name || '', posts: deptPosts })

    const remaining = 20 - deptPosts.length
    const facultyPosts = await fetchPosts(userFacultyComs, remaining)
    if (facultyPosts.length) cascadeOrder.push({ type: 'faculty', posts: facultyPosts })

    const remaining2 = 20 - facultyPosts.length
    const schoolPosts = await fetchPosts(userSchoolComs, remaining2)
    if (schoolPosts.length) cascadeOrder.push({ type: 'school', posts: schoolPosts })

    const remaining3 = 20 - schoolPosts.length
    const generalPosts = await fetchPosts(userGeneralComs, remaining3)
    if (generalPosts.length) cascadeOrder.push({ type: 'general', posts: generalPosts })

    return res.json(cascadeOrder)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
