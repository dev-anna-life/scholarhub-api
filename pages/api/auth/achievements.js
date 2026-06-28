const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { achievements } = req.body
    if (!achievements || !Array.isArray(achievements)) {
      return res.status(400).json({ message: 'Achievements array is required' })
    }

    // Merge new achievements with existing badges/achievements
    const current = new Set(user.badges || [])
    let newCoins = 0
    let added = []

    achievements.forEach(ach => {
      if (!current.has(ach)) {
        current.add(ach)
        added.push(ach)
        newCoins += 20 // reward for new achievement
      }
    })

    if (added.length > 0) {
      user.badges = Array.from(current)
      user.coins = (user.coins || 0) + newCoins
      user.lifetimeCoins = (user.lifetimeCoins || 0) + newCoins
      await user.save()
    }

    res.json({
      message: added.length > 0 ? `Synced ${added.length} new achievements and earned ${newCoins} coins!` : 'Achievements are up to date',
      badges: user.badges,
      coins: user.coins
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
