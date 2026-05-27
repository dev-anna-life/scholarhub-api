const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Purchase = require('../../../models/Purchase')
const { protect } = require('../../../lib/auth')

const badgeItems = [
  { id: 'badge_basic', name: 'Basic', price: 3000, durationMonths: 1 },
  { id: 'badge_premium', name: 'Premium', price: 10000, durationMonths: 3 },
  { id: 'badge_extra_premium', name: 'Extra Premium', price: 20000, durationMonths: 12 },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { itemId, recipientEmail } = req.body
    if (!itemId) return res.status(400).json({ message: 'itemId is required' })

    const item = badgeItems.find(i => i.id === itemId)
    if (!item) return res.status(404).json({ message: 'Badge not found' })

    let targetUser = user
    if (recipientEmail) {
      targetUser = await User.findOne({ email: recipientEmail })
      if (!targetUser) return res.status(404).json({ message: 'Recipient not found' })
    }

    const buyer = recipientEmail ? user : targetUser
    if (buyer.coins < item.price) {
      return res.status(400).json({ message: `Not enough coins. You need ${item.price} coins.` })
    }

    buyer.coins -= item.price
    await buyer.save()

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + item.durationMonths)

    if (!targetUser.badgeSubscriptions) targetUser.badgeSubscriptions = []
    const existing = targetUser.badgeSubscriptions.find(s => s.id === itemId)
    if (existing) {
      existing.expiresAt = new Date(Math.max(new Date(existing.expiresAt).getTime(), Date.now()) + item.durationMonths * 30 * 24 * 60 * 60 * 1000)
    } else {
      targetUser.badgeSubscriptions.push({ id: itemId, purchasedAt: new Date(), expiresAt })
    }
    await targetUser.save()

    await Purchase.create({
      user: targetUser._id, itemId, itemName: item.name,
      price: item.price, type: recipientEmail ? 'gift' : 'buy',
      giftedBy: recipientEmail ? user._id : undefined,
    })

    res.json({
      message: recipientEmail ? `${item.name} badge gifted!` : `${item.name} badge purchased!`,
      coins: user.coins,
      badgeSubscriptions: user.badgeSubscriptions,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}