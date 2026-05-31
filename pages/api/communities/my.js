const dbConnect = require('../../../lib/db')
const Community = require('../../../models/Community')
const Post = require('../../../models/Post')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const communities = await Community.find({ members: user._id }).sort({ type: 1, name: 1 }).lean()

    const postsByCommunity = {}
    for (const c of communities) {
      const posts = await Post.find({
        status: 'approved',
        communities: c._id,
      })
        .populate('author', 'name username avatar school level faculty department')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
      postsByCommunity[c._id] = posts.map(p => ({ ...p, liked: p.likes?.includes(user._id) || false, likesCount: (p.likes || []).length }))
    }

    return res.json({ communities, postsByCommunity })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
