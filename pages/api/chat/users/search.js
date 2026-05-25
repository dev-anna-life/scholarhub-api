const User = require('../../../../models/User')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const { q } = req.query
    if (!q) return res.status(400).json({ message: 'Search query required' })
    const users = await User.find({
      _id: { $ne: user._id },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
      ],
    }).select('name username avatar school level').limit(20).lean()
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
