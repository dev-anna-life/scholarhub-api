const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Purchase = require('../../../models/Purchase')
const { protect } = require('../../../lib/auth')

const activationPrices = {
  badge: 500, transfer: 500, community: 100,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { feature } = req.body
    if (!feature || !activationPrices[feature]) {
      return res.status(400).json({ message: 'Invalid feature. Valid: badge, transfer, community' })
    }

    if (user.activatedFeatures.includes(feature)) {
      return res.status(400).json({ message: 'Feature already activated' })
    }

    const price = activationPrices[feature]
    if (user.coins < price) {
      return res.status(400).json({ message: `Not enough coins. You need ${price} coins.` })
    }

    user.coins -= price
    user.activatedFeatures.push(feature)
    await user.save()

    await Purchase.create({
      user: user._id, itemId: `activate_${feature}`,
      itemName: `Activate ${feature}`, price, type: 'activation',
    })

    res.json({
      message: `${feature} activated successfully!`,
      coins: user.coins,
      activatedFeatures: user.activatedFeatures,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
