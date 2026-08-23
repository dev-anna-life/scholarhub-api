const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const sender = await protect(req, res)
    if (!sender) return

    const { username, amount, postId } = req.body
    if (!username || !amount || amount < 1) {
      return res.status(400).json({ message: 'username and amount (min 1) required' })
    }

    const parsed = parseInt(amount)
    if (isNaN(parsed) || parsed < 1) return res.status(400).json({ message: 'Invalid amount' })

    const recipient = await prisma.user.findUnique({ where: { username: username.toLowerCase() } })
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' })

    if (sender.id === recipient.id) {
      return res.status(400).json({ message: 'Cannot send coins to yourself' })
    }

    if (sender.coins < parsed) {
      return res.status(400).json({ message: `Not enough coins. You have ${sender.coins} coins.` })
    }

    await prisma.user.update({ where: { id: sender.id }, data: { coins: { decrement: parsed } } })
    await prisma.user.update({ where: { id: recipient.id }, data: { coins: { increment: parsed } } })

    await prisma.purchase.create({
      data: { userId: sender.id, recipientId: recipient.id, itemId: 'coin_transfer', itemName: `${parsed} coins`, price: parsed, type: 'transfer' }
    })
    await prisma.notification.create({
      data: { userId: recipient.id, fromUserId: sender.id, type: 'gift', text: `${sender.name} sent you ${parsed} coins!` }
    })

    if (postId) {
      await prisma.comment.create({
        data: {
          text: `🎁 Gifted ${parsed} Scholar Coins to @${recipient.username || recipient.name}!`,
          content: `🎁 Gifted ${parsed} Scholar Coins to @${recipient.username || recipient.name}!`,
          postId,
          authorId: sender.id,
        }
      }).catch(() => {})
    }

    const updatedSender = await prisma.user.findUnique({ where: { id: sender.id } })
    res.json({ message: `Sent ${parsed} coins to ${recipient.name}`, coins: updatedSender.coins })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
