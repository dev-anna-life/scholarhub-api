const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Purchase = require('../../../models/Purchase')
const { protect } = require('../../../lib/auth')

const badgeItems = [
  { id: 'badge_1', name: 'Scholar', price: 100 },
  { id: 'badge_2', name: 'Helper', price: 100 },
  { id: 'badge_3', name: 'Innovator', price: 150 },
  { id: 'badge_4', name: 'Athlete', price: 100 },
  { id: 'badge_5', name: 'Leader', price: 200 },
  { id: 'badge_6', name: 'Artist', price: 100 },
  { id: 'badge_7', name: 'MVP', price: 300 },
  { id: 'badge_8', name: 'Veteran', price: 250 },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    if (!user.activatedFeatures.includes('badge')) {
      return res.status(400).json({ message: 'Badge system not activated. Go to shop and activate for 500 coins first.' })
    }

    const { itemId } = req.body
    if (!itemId) return res.status(400).json({ message: 'itemId is required' })

    const item = badgeItems.find(i => i.id === itemId)
    if (!item) return res.status(404).json({ message: 'Badge not found' })

    if (user.coins < item.price) {
      return res.status(400).json({ message: `Not enough coins. You need ${item.price} coins.` })
    }

    if (user.achievements && user.achievements.includes(itemId)) {
      return res.status(400).json({ message: 'You already own this badge' })
    }

    user.coins -= item.price
    if (!user.achievements) user.achievements = []
    user.achievements.push(itemId)
    await user.save()

    await Purchase.create({ user: user._id, itemId, itemName: item.name, price: item.price, type: 'buy' })

    res.json({
      message: `You bought the ${item.name} badge!`,
      coins: user.coins,
      achievements: user.achievements,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
