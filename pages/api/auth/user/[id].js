const dbConnect = require('../../../../lib/db')
const prisma = require('../../../../lib/prisma')
const jwt = require('jsonwebtoken')

async function getOptionalUser(req) {
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return await prisma.user.findUnique({ where: { id: decoded.id } })
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  try {
    await dbConnect()
    const targetId = req.query.id
    if (!targetId) return res.status(400).json({ message: 'User ID is required' })

    const userRaw = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        followers: {
          include: {
            follower: {
              select: { id: true, name: true, username: true, avatar: true, school: true, level: true }
            }
          }
        },
        following: {
          include: {
            following: {
              select: { id: true, name: true, username: true, avatar: true, school: true, level: true }
            }
          }
        }
      }
    })

    if (!userRaw) return res.status(404).json({ message: 'User not found' })

    const currentUser = await getOptionalUser(req)

    let isFollowing = false
    let isFollowedBy = false

    if (currentUser) {
      const followRecord = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUser.id, followingId: targetId } }
      })
      isFollowing = !!followRecord

      const reverseFollowRecord = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: targetId, followingId: currentUser.id } }
      })
      isFollowedBy = !!reverseFollowRecord
    }

    const followersList = userRaw.followers.map(f => f.follower).filter(Boolean)
    const followingList = userRaw.following.map(f => f.following).filter(Boolean)

    const { password, followers, following, ...userClean } = userRaw
    const now = Date.now()
    const myActivityStatus = currentUser ? currentUser.showActivityStatus !== false : true
    const targetActivityStatus = userRaw.showActivityStatus !== false
    const canSeePresence = myActivityStatus && targetActivityStatus

    const lastActiveTime = userRaw.lastActive ? new Date(userRaw.lastActive).getTime() : 0
    const isOnline = canSeePresence ? (now - lastActiveTime) < 2 * 60 * 1000 : false

    res.json({
      ...userClean,
      isOnline,
      lastActive: canSeePresence ? userRaw.lastActive : null,
      followersCount: followersList.length,
      followingCount: followingList.length,
      followers: followersList,
      following: followingList,
      isFollowing,
      isFollowedBy
    })
  } catch (error) {
    console.error('GetUserById API Error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
