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

    const { username, amount } = req.body
    if (!username || !amount || amount < 1) {
      return res.status(400).json({ message: 'username and amount (min 1) required' })
    }

    const parsed = parseInt(amount)
    if (isNaN(parsed) || parsed < 1) return res.status(400).json({ message: 'Invalid amount' })

    const recipient = await User.findOne({ username: username.toLowerCase() })
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' })

    if (sender._id.toString() === recipient._id.toString()) {
      return res.status(400).json({ message: 'Cannot send coins to yourself' })
    }

    if (sender.coins < parsed) {
      return res.status(400).json({ message: `Not enough coins. You have ${sender.coins} coins.` })
    }

    sender.coins -= parsed
    recipient.coins += parsed
    await sender.save()
    await recipient.save()

    await Purchase.create({ user: sender._id, recipient: recipient._id, itemId: 'coin_transfer', itemName: `${parsed} coins`, price: parsed, type: 'transfer' })
    await Notification.create({ user: recipient._id, fromUser: sender._id, type: 'gift', text: `${sender.name} sent you ${parsed} coins!` })

    res.json({ message: `Sent ${parsed} coins to ${recipient.name}`, coins: sender.coins })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
