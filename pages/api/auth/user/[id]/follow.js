const prisma = require('../../../../../lib/prisma')
const { protect } = require('../../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const targetId = req.query.id
    if (targetId === user.id) return res.status(400).json({ message: 'Cannot follow yourself' })

    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) return res.status(404).json({ message: 'User not found' })

    const isFollowerStudent = !user.status || user.status === 'Current Student'
    const isTargetAlumniGrad = target.status && target.status !== 'Current Student'
    if (isFollowerStudent && isTargetAlumniGrad) {
      return res.status(403).json({ message: `Students cannot follow ${target.status === 'Graduate' ? 'graduates' : 'alumni'}` })
    }

    const existingFollow = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: targetId } } })

    let isFollowing
    if (existingFollow) {
      await prisma.follow.delete({ where: { followerId_followingId: { followerId: user.id, followingId: targetId } } })
      isFollowing = false
    } else {
      await prisma.follow.create({ data: { followerId: user.id, followingId: targetId } })
      await prisma.notification.create({ data: { userId: targetId, fromUserId: user.id, type: 'follow', text: 'started following you' } })
      isFollowing = true
    }

    const { password, ...updatedUser } = await prisma.user.findUnique({ where: { id: user.id } })
    res.json({ user: updatedUser, following: isFollowing })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
