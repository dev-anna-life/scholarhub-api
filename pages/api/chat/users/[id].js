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
        followers: {
          select: {
            followerId: true,
            follower: {
              select: { id: true, name: true, username: true, avatar: true, school: true, level: true, badge: true }
            }
          }
        },
        following: {
          select: {
            followingId: true,
            following: {
              select: { id: true, name: true, username: true, avatar: true, school: true, level: true, badge: true }
            }
          }
        },
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

    const followersList = user.followers.map(f => f.follower).filter(Boolean)
    const followingList = user.following.map(f => f.following).filter(Boolean)

    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      school: user.school,
      level: user.level,
      badge: user.badge,
      followers: followersList,
      following: followingList,
      isFollowing,
      isFollowedBy,
      followersCount: followersList.length,
      followingCount: followingList.length,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
