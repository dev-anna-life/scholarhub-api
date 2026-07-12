const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

const badgeItems = [
  { id: 'badge_basic', name: 'Basic', price: 3000, durationMonths: 1 },
  { id: 'badge_premium', name: 'Premium', price: 10000, durationMonths: 3 },
  { id: 'badge_extra_premium', name: 'Extra Premium', price: 20000, durationMonths: 12 },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { itemId, recipientUsername } = req.body
    if (!itemId) return res.status(400).json({ message: 'itemId is required' })

    const item = badgeItems.find(i => i.id === itemId)
    if (!item) return res.status(404).json({ message: 'Badge not found' })

    let targetUser = user
    if (recipientUsername) {
      targetUser = await prisma.user.findUnique({ where: { username: recipientUsername.toLowerCase() } })
      if (!targetUser) return res.status(404).json({ message: 'Recipient not found' })
    }

    const buyer = recipientUsername ? user : targetUser
    if (buyer.coins < item.price) {
      return res.status(400).json({ message: `Not enough coins. You need ${item.price} coins.` })
    }

    await prisma.user.update({
      where: { id: buyer.id },
      data: { coins: { decrement: item.price } }
    })

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + item.durationMonths)

    const badgeSubscriptions = targetUser.badgeSubscriptions || []
    const existingIdx = badgeSubscriptions.findIndex(s => s.badgeId === itemId)
    if (existingIdx >= 0) {
      const oldExp = new Date(badgeSubscriptions[existingIdx].expiresAt).getTime()
      const newExp = Math.max(oldExp, Date.now()) + item.durationMonths * 30 * 24 * 60 * 60 * 1000
      badgeSubscriptions[existingIdx].expiresAt = new Date(newExp)
    } else {
      badgeSubscriptions.push({ badgeId: itemId, purchasedAt: new Date(), expiresAt })
    }
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { badgeSubscriptions }
    })

    await prisma.purchase.create({
      data: {
        userId: targetUser.id, itemId, itemName: item.name,
        price: item.price, type: recipientUsername ? 'gift' : 'buy',
        giftedBy: recipientUsername ? user.id : null,
      }
    })

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })

    res.json({
      message: recipientUsername ? `${item.name} badge gifted!` : `${item.name} badge purchased!`,
      coins: updatedUser.coins,
      badgeSubscriptions: updatedUser.badgeSubscriptions,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
