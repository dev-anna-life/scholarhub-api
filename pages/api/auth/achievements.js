const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
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

    const current = new Set(user.badges || [])
    let newCoins = 0
    let added = []

    achievements.forEach(ach => {
      if (!current.has(ach)) {
        current.add(ach)
        added.push(ach)
        newCoins += 20
      }
    })

    let badges = user.badges || []
    let coins = user.coins || 0
    let lifetimeCoins = user.lifetimeCoins || 0

    if (added.length > 0) {
      badges = Array.from(current)
      coins = coins + newCoins
      lifetimeCoins = lifetimeCoins + newCoins
      await prisma.user.update({ where: { id: user.id }, data: { badges, coins, lifetimeCoins } })
    }

    res.json({
      message: added.length > 0 ? `Synced ${added.length} new achievements and earned ${newCoins} coins!` : 'Achievements are up to date',
      badges,
      coins,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
