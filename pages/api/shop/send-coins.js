const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Purchase = require('../../../models/Purchase')
const Notification = require('../../../models/Notification')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const sender = await protect(req, res)
    if (!sender) return

    if (!sender.activatedFeatures.includes('transfer')) {
      return res.status(400).json({ message: 'Coin transfer not activated. Activate in shop first.' })
    }

    const { recipientId, amount } = req.body
    if (!recipientId || !amount || amount < 1) {
      return res.status(400).json({ message: 'recipientId and amount (min 1) required' })
    }

    const parsed = parseInt(amount)
    if (isNaN(parsed) || parsed < 1) return res.status(400).json({ message: 'Invalid amount' })

    const recipient = await User.findById(recipientId)
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' })

    if (sender._id.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot send coins to yourself' })
    }

    if (sender.coins < parsed) {
      return res.status(400).json({ message: `Not enough coins. You have ${sender.coins} coins.` })
    }

    sender.coins -= parsed
    recipient.coins += parsed
    await sender.save()
    await recipient.save()

    await Purchase.create({ user: sender._id, recipient: recipientId, itemId: 'coin_transfer', itemName: `${parsed} coins`, price: parsed, type: 'transfer' })
    await Notification.create({ user: recipientId, fromUser: sender._id, type: 'gift', text: `${sender.name} sent you ${parsed} coins!` })

    res.json({ message: `Sent ${parsed} coins to ${recipient.name}`, coins: sender.coins })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
