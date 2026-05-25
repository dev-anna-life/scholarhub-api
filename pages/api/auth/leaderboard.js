const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const users = await User.find({}).select('name username avatar school level coins').sort({ coins: -1 }).limit(100).lean()
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
