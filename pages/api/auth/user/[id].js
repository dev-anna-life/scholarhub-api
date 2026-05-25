const dbConnect = require('../../../../lib/db')
const User = require('../../../../models/User')

export default async function handler(req, res) {
  try {
    await dbConnect()
    const user = await User.findById(req.query.id).select('-password').lean()
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
