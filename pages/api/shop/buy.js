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

    // Resolve target user (recipient if gifting, else self)
    let targetUser = user
    if (recipientUsername) {
      targetUser = await prisma.user.findUnique({ where: { username: recipientUsername.toLowerCase() } })
      if (!targetUser) return res.status(404).json({ message: 'Recipient not found' })
    }

    // The buyer pays — always the logged-in user
    const buyerFull = await prisma.user.findUnique({ where: { id: user.id } })
    if (buyerFull.coins < item.price) {
      return res.status(400).json({ message: `Not enough coins. You need ${item.price} coins but only have ${buyerFull.coins}.` })
    }

    // Deduct coins from buyer
    await prisma.user.update({
      where: { id: buyerFull.id },
      data: { coins: { decrement: item.price } }
    })

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + item.durationMonths)

    // Check if target already has an active subscription for this badge
    const now = new Date()
    const existing = await prisma.badgeSubscription.findFirst({
      where: { userId: targetUser.id, badgeId: itemId, expiresAt: { gt: now } }
    })

    if (existing) {
      // Extend from current expiry
      const extendedExpiry = new Date(existing.expiresAt)
      extendedExpiry.setMonth(extendedExpiry.getMonth() + item.durationMonths)
      await prisma.badgeSubscription.update({
        where: { id: existing.id },
        data: { expiresAt: extendedExpiry }
      })
    } else {
      // Create new subscription
      await prisma.badgeSubscription.create({
        data: { userId: targetUser.id, badgeId: itemId, purchasedAt: new Date(), expiresAt }
      })
    }

    // Record purchase log
    await prisma.purchase.create({
      data: {
        userId: buyerFull.id,
        recipientId: recipientUsername ? targetUser.id : null,
        itemId,
        itemName: item.name,
        price: item.price,
        type: recipientUsername ? 'gift' : 'buy',
        giftedBy: recipientUsername ? buyerFull.id : null,
      }
    })

    // Return updated buyer info
    const updatedBuyer = await prisma.user.findUnique({
      where: { id: buyerFull.id },
      include: { badgeSubscriptions: true }
    })

    res.json({
      message: recipientUsername
        ? `${item.name} badge gifted to @${recipientUsername}!`
        : `${item.name} badge purchased successfully!`,
      coins: updatedBuyer.coins,
      badgeSubscriptions: updatedBuyer.badgeSubscriptions,
    })
  } catch (error) {
    console.error('Buy badge error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
