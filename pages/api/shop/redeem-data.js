const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const { protect } = require('../../../lib/auth')

const dataItems = {
  data_500mb_daily: { code: '500MB-DAILY', price: 250 },
  data_1gb_weekly: { code: '1GB-WEEKLY', price: 350 },
  data_2gb_weekly: { code: '2GB-WEEKLY', price: 650 },
  data_500mb_30d: { code: '500MB-30D', price: 400 },
  data_2gb_30d: { code: '2GB-30D', price: 900 },
  data_1gb_monthly: { code: '1GB-MONTHLY', price: 500 },
  data_3gb_monthly: { code: '3GB-MONTHLY', price: 1200 },
  data_5gb_monthly: { code: '5GB-MONTHLY', price: 1800 },
  data_10gb_30d: { code: '10GB-30D', price: 3200 },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { itemId, phone, network } = req.body
    if (!itemId || !phone) return res.status(400).json({ message: 'Missing itemId or phone' })

    const item = dataItems[itemId]
    if (!item) return res.status(400).json({ message: 'Invalid data item' })

    if (user.coins < item.price) return res.status(400).json({ message: 'Insufficient coins' })

    if (process.env.VTU_API_KEY && process.env.VTU_API_URL) {
      const axios = require('axios')
      await axios.post(`${process.env.VTU_API_URL}/data`, {
        apiKey: process.env.VTU_API_KEY,
        phone,
        plan: item.code,
        network: network || 'mtn',
      })
    }

    user.coins -= item.price
    await user.save()

    res.json({ message: 'Data plan redeemed successfully!', coins: user.coins })
  } catch (error) {
    res.status(500).json({ message: 'Redemption failed', error: error.message })
  }
}