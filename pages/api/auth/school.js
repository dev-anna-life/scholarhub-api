const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return
    const { school, level, course, state } = req.body
    const updates = {}
    if (school !== undefined) updates.school = school
    if (level !== undefined) updates.level = level
    if (course !== undefined) updates.course = course
    if (state !== undefined) updates.state = state
    const updated = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true }).select('-password')
    res.json({ user: updated.toObject() })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
