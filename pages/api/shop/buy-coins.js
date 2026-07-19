const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

const coinPackages = [
  { id: 'coins_5000', amount: 5000, priceNGN: 10000, name: '5,000 Scholar Coins' },
  { id: 'coins_10000', amount: 10000, priceNGN: 20000, name: '10,000 Scholar Coins' },
  { id: 'coins_25000', amount: 25000, priceNGN: 50000, name: '25,000 Scholar Coins' },
  { id: 'coins_50000', amount: 50000, priceNGN: 100000, name: '50,000 Scholar Coins' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { itemId, recipientUsername } = req.body
    if (!itemId) return res.status(400).json({ message: 'itemId is required' })

    const pkg = coinPackages.find(p => p.id === itemId)
    if (!pkg) return res.status(404).json({ message: 'Coin package not found' })

    let targetUser = user
    if (recipientUsername && recipientUsername.trim()) {
      targetUser = await prisma.user.findUnique({
        where: { username: recipientUsername.trim().toLowerCase() }
      })
      if (!targetUser) return res.status(404).json({ message: 'Recipient username not found' })
    }

    // Add coins to target user
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { coins: { increment: pkg.amount } }
    })

    // Create purchase record
    await prisma.purchase.create({
      data: {
        userId: user.id,
        recipientId: targetUser.id !== user.id ? targetUser.id : null,
        itemId: pkg.id,
        itemName: pkg.name,
        price: pkg.priceNGN,
        type: targetUser.id !== user.id ? 'coin_gift' : 'coin_purchase',
        giftedBy: targetUser.id !== user.id ? user.id : null,
      }
    })

    // Create notification if gifted
    if (targetUser.id !== user.id) {
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          fromUserId: user.id,
          type: 'gift',
          text: `${user.name} bought and gifted you ${pkg.amount.toLocaleString()} Scholar Coins!`
        }
      })
    }

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })

    res.json({
      message: targetUser.id !== user.id
        ? `Successfully gifted ${pkg.amount.toLocaleString()} coins to ${targetUser.name}!`
        : `Successfully purchased ${pkg.amount.toLocaleString()} Scholar Coins!`,
      coins: updatedUser.coins
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
