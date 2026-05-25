const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Purchase = require('../../../models/Purchase')
const { protect } = require('../../../lib/auth')

const shopItems = [
  { id: 'badge_1', name: 'Scholar', price: 100 },
  { id: 'badge_2', name: 'Helper', price: 100 },
  { id: 'badge_3', name: 'Innovator', price: 150 },
  { id: 'badge_4', name: 'Athlete', price: 100 },
  { id: 'badge_5', name: 'Leader', price: 200 },
  { id: 'badge_6', name: 'Artist', price: 100 },
  { id: 'badge_7', name: 'MVP', price: 300 },
  { id: 'badge_8', name: 'Veteran', price: 250 },
  { id: 'cosmetic_1', name: 'Gold Frame', price: 500 },
  { id: 'cosmetic_2', name: 'Neon Tag', price: 750 },
  { id: 'boost_1', name: 'XP Boost', price: 200 },
  { id: 'boost_2', name: 'Visibility Boost', price: 300 },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { itemId } = req.body
    if (!itemId) return res.status(400).json({ message: 'itemId is required' })

    const item = shopItems.find(i => i.id === itemId)
    if (!item) return res.status(404).json({ message: 'Item not found' })

    if (user.coins < item.price) {
      return res.status(400).json({ message: 'Not enough coins' })
    }

    if (user.achievements && user.achievements.includes(itemId)) {
      return res.status(400).json({ message: 'Item already owned' })
    }

    const existing = await Purchase.findOne({ user: user._id, itemId, type: 'buy' })
    if (existing) return res.status(400).json({ message: 'Item already purchased' })

    user.coins -= item.price
    if (!user.achievements) user.achievements = []
    user.achievements.push(itemId)
    await user.save()

    await Purchase.create({ user: user._id, itemId, itemName: item.name, price: item.price, type: 'buy' })

    res.json({
      message: `Successfully purchased ${item.name}`,
      coins: user.coins,
      achievements: user.achievements,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
