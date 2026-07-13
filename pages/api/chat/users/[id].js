const prisma = require('../../../../lib/prisma')

function getTokenUserId(req) {
  const jwt = require('jsonwebtoken')
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  try { return jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET).id } catch { return null }
}

export default async function handler(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.query.id },
      select: {
        id: true, name: true, username: true, avatar: true, school: true, level: true, badge: true,
        followers: { select: { followerId: true } },
        following: { select: { followingId: true } },
      },
    })
    if (!user) return res.status(404).json({ message: 'User not found' })

    const currentUserId = getTokenUserId(req)
    const isFollowing = currentUserId
      ? user.followers.some(f => f.followerId === currentUserId)
      : false
    const isFollowedBy = currentUserId
      ? user.following.some(f => f.followingId === currentUserId)
      : false

    res.json({
      ...user,
      isFollowing,
      isFollowedBy,
      followersCount: user.followers.length,
      followingCount: user.following.length,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
