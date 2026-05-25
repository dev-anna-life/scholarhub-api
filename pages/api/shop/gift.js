const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Purchase = require('../../../models/Purchase')
const Notification = require('../../../models/Notification')
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
    const sender = await protect(req, res)
    if (!sender) return

    const { itemId, recipientId } = req.body
    if (!itemId || !recipientId) return res.status(400).json({ message: 'itemId and recipientId are required' })

    const item = shopItems.find(i => i.id === itemId)
    if (!item) return res.status(404).json({ message: 'Item not found' })

    const recipient = await User.findById(recipientId)
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' })

    if (sender._id.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot gift to yourself. Use buy instead.' })
    }

    if (sender.coins < item.price) {
      return res.status(400).json({ message: 'Not enough coins' })
    }

    sender.coins -= item.price
    if (!recipient.achievements) recipient.achievements = []
    recipient.achievements.push(itemId)
    await sender.save()
    await recipient.save()

    await Purchase.create({
      user: sender._id, recipient: recipientId, itemId, itemName: item.name,
      price: item.price, type: 'gift',
    })

    await Notification.create({
      user: recipientId,
      fromUser: sender._id,
      type: 'gift',
      text: `${sender.name} gifted you a ${item.name}!`,
    })

    res.json({
      message: `Gifted ${item.name} to ${recipient.name}`,
      coins: sender.coins,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
