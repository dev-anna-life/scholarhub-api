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

const NETWORK_MAP = { mtn: 'mtn', glo: 'glo', airtel: 'airtel', '9mobile': '9mobile' }

async function callVTU(phone, amount, network) {
  const axios = require('axios')
  const baseURL = process.env.VTU_API_URL || 'https://vtu.ng/wp-json'

  const loginRes = await axios.post(`${baseURL}/jwt-auth/v1/token`, {
    username: process.env.VTU_USERNAME,
    password: process.env.VTU_PASSWORD,
  })
  const token = loginRes.data.token

  const request_id = `sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const res = await axios.post(`${baseURL}/api/v2/airtime`, {
    request_id,
    phone,
    service_id: NETWORK_MAP[network] || network,
    amount,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  })

  return res.data
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

    if (process.env.VTU_USERNAME && process.env.VTU_PASSWORD) {
      try {
        await callVTU(phone, item.value, network || 'mtn')
      } catch (vtuErr) {
        return res.status(502).json({ message: 'VTU provider error', error: vtuErr.message })
      }
    }

    user.coins -= item.price
    await user.save()

    res.json({ message: `₦${item.value} airtime redeemed successfully!`, coins: user.coins })
  } catch (error) {
    res.status(500).json({ message: 'Redemption failed', error: error.message })
  }
}
