const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')
const { sendNotificationWithEmail } = require('../../../lib/notifications')

const reactionGifts = [
  { id: 'gift_helpful', name: 'Helpful', price: 10, icon: 'FiThumbsUp' },
  { id: 'gift_insightful', name: 'Insightful', price: 25, icon: 'FiLightbulb' },
  { id: 'gift_creative', name: 'Creative', price: 50, icon: 'FiPalette' },
  { id: 'gift_brilliant', name: 'Brilliant', price: 100, icon: 'FiZap' },
  { id: 'gift_intelligent', name: 'Super Intelligent', price: 250, icon: 'FiStar' },
  { id: 'gift_masterclass', name: 'Masterclass', price: 500, icon: 'FiAward' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const sender = await protect(req, res)
    if (!sender) return

    const { itemId, recipientId, commentId, postId } = req.body
    if (!itemId || !recipientId) return res.status(400).json({ message: 'itemId and recipientId are required' })

    const item = reactionGifts.find(i => i.id === itemId)
    if (!item) return res.status(404).json({ message: 'Reaction gift not found' })

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } })
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' })

    if (sender.id === recipientId) {
      return res.status(400).json({ message: 'Cannot gift to yourself.' })
    }

    if (sender.coins < item.price) {
      return res.status(400).json({ message: `Not enough coins. You need ${item.price} coins.` })
    }

    // Deduct coins from sender, add coins to recipient
    await prisma.user.update({ where: { id: sender.id }, data: { coins: { decrement: item.price } } })
    await prisma.user.update({ where: { id: recipientId }, data: { coins: { increment: item.price } } })

    await prisma.purchase.create({
      data: { userId: sender.id, recipientId, itemId, itemName: item.name, price: item.price, type: 'gift' }
    })

    let targetPostId = postId || null
    if (!targetPostId && commentId) {
      const c = await prisma.comment.findUnique({ where: { id: commentId }, select: { postId: true } })
      if (c) targetPostId = c.postId
    }

    if (commentId) {
      await prisma.comment.update({
        where: { id: commentId },
        data: { gifts: { push: itemId } }
      })
    } else if (postId) {
      await prisma.post.update({
        where: { id: postId },
        data: { gifts: { push: itemId } }
      })
    }

    await sendNotificationWithEmail({
      userId: recipientId,
      fromUserId: sender.id,
      postId: targetPostId,
      type: 'gift',
      text: commentId
        ? `awarded your comment a ${item.name} reaction gift (+${item.price} coins)!`
        : `awarded your post a ${item.name} reaction gift (+${item.price} coins)!`,
      customSubject: commentId
        ? `${sender.name} awarded your comment a ${item.name} reaction!`
        : `${sender.name} awarded your post a ${item.name} reaction!`
    })

    const updatedSender = await prisma.user.findUnique({ where: { id: sender.id } })
    res.json({ message: `Gifted ${item.name} reaction to ${recipient.name}!`, coins: updatedSender.coins })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
