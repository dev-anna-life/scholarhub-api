const dbConnect = require('../../../../lib/db')
const User = require('../../../../models/User')

function getTokenUserId(req) {
  const jwt = require('jsonwebtoken')
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  try { return jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET).id } catch { return null }
}

export default async function handler(req, res) {
  try {
    await dbConnect()
    const user = await User.findById(req.query.id).select('-password').lean()
    if (!user) return res.status(404).json({ message: 'User not found' })

    const currentUserId = getTokenUserId(req)
    const isFollowing = currentUserId
      ? (user.followers || []).some(f => (f._id || f)?.toString() === currentUserId)
      : false
    const isFollowedBy = currentUserId
      ? (user.following || []).some(f => (f._id || f)?.toString() === currentUserId)
      : false

    res.json({
      ...user,
      isFollowing,
      isFollowedBy,
      followersCount: (user.followers || []).length,
      followingCount: (user.following || []).length,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
