const dbConnect = require('../../../../lib/db')
const User = require('../../../../models/User')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const { q } = req.query
    if (!q || q.length < 2) return res.json([])

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { school: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name school level badge')
      .limit(10)
      .lean()

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
