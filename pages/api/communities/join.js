const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { communityId, action } = req.body
    if (!communityId) return res.status(400).json({ message: 'Community ID required' })

    const community = await prisma.community.findUnique({ where: { id: communityId } })
    if (!community) return res.status(404).json({ message: 'Community not found' })

    if (community.type !== 'general' && community.faculty && community.faculty !== (user.faculty || '')) {
      return res.status(403).json({ message: 'You can only join communities within your faculty' })
    }

    if (action === 'join') {
      const existing = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: user.id } }
      })
      if (existing) return res.json({ message: 'Already a member' })
      await prisma.communityMember.create({
        data: { communityId, userId: user.id }
      })
      const updated = await prisma.community.findUnique({ where: { id: communityId } })
      return res.json({ message: 'Joined community', community: updated })
    }

    if (action === 'leave') {
      await prisma.communityMember.deleteMany({
        where: { communityId, userId: user.id }
      })
      const updated = await prisma.community.findUnique({ where: { id: communityId } })
      return res.json({ message: 'Left community', community: updated })
    }

    return res.status(400).json({ message: 'Action must be join or leave' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
