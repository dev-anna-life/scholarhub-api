const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await User.updateMany(
      { $and: [{ monthlyCoinsMonth: { $exists: true } }, { monthlyCoinsMonth: { $ne: currentMonth } }] },
      { $set: { monthlyCoins: 0, monthlyCoinsMonth: currentMonth } }
    )
    const users = await User.find({ monthlyCoins: { $gt: 0 } }).select('name username avatar school level monthlyCoins').sort({ monthlyCoins: -1 }).limit(100).lean()
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
