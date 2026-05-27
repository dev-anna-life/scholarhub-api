const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const { protect } = require('../../../lib/auth')

const airtimeItems = {
  airtime_50: { value: 50, price: 50 },
  airtime_100: { value: 100, price: 100 },
  airtime_200: { value: 200, price: 200 },
  airtime_500: { value: 500, price: 500 },
  airtime_1000: { value: 1000, price: 1000 },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { itemId, phone, network } = req.body
    if (!itemId || !phone) return res.status(400).json({ message: 'Missing itemId or phone' })

    const item = airtimeItems[itemId]
    if (!item) return res.status(400).json({ message: 'Invalid airtime item' })

    if (user.coins < item.price) return res.status(400).json({ message: 'Insufficient coins' })

    if (process.env.VTU_API_KEY && process.env.VTU_API_URL) {
      const axios = require('axios')
      await axios.post(`${process.env.VTU_API_URL}/airtime`, {
        apiKey: process.env.VTU_API_KEY,
        phone,
        amount: item.value,
        network: network || 'any',
      })
    }

    user.coins -= item.price
    await user.save()

    res.json({ message: `₦${item.value} airtime redeemed successfully!`, coins: user.coins })
  } catch (error) {
    res.status(500).json({ message: 'Redemption failed', error: error.message })
  }
}