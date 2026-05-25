const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return
    res.json(user.toObject())
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
