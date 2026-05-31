const dbConnect = require('../../../lib/db')
const Community = require('../../../models/Community')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { communityId, action } = req.body
    if (!communityId) return res.status(400).json({ message: 'Community ID required' })

    const community = await Community.findById(communityId)
    if (!community) return res.status(404).json({ message: 'Community not found' })

    if (action === 'join') {
      if (community.members.includes(user._id)) {
        return res.json({ message: 'Already a member' })
      }
      community.members.push(user._id)
      await community.save()
      return res.json({ message: 'Joined community', community })
    }

    if (action === 'leave') {
      community.members = community.members.filter(m => m.toString() !== user._id.toString())
      await community.save()
      return res.json({ message: 'Left community', community })
    }

    return res.status(400).json({ message: 'Action must be join or leave' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
