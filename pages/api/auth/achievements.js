const User = require('../../../models/User')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const { achievements } = req.body
    if (!achievements) return res.status(400).json({ message: 'Achievements data required' })
    await User.findByIdAndUpdate(user._id, { $set: { achievements } })
    res.json({ achievements })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
