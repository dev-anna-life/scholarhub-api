const prisma = require('../../../lib/prisma')
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

const NETWORK_MAP = { mtn: 'mtn', glo: 'glo', airtel: 'airtel', '9mobile': '9mobile' }

async function callVTU(phone, network) {
  const axios = require('axios')
  const baseURL = process.env.VTU_API_URL || 'https://vtu.ng/wp-json'

  const loginRes = await axios.post(`${baseURL}/jwt-auth/v1/token`, {
    username: process.env.VTU_USERNAME,
    password: process.env.VTU_PASSWORD,
  })
  return loginRes.data.token
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { itemId, phone, network } = req.body
    if (!itemId || !phone) return res.status(400).json({ message: 'Missing itemId or phone' })

    const item = dataItems[itemId]
    if (!item) return res.status(400).json({ message: 'Invalid data item' })

    if (user.coins < item.price) return res.status(400).json({ message: 'Insufficient coins' })

    if (process.env.VTU_USERNAME && process.env.VTU_PASSWORD) {
      const axios = require('axios')
      const baseURL = process.env.VTU_API_URL || 'https://vtu.ng/wp-json'
      try {
        const token = await callVTU(phone, network || 'mtn')
        const request_id = `sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        await axios.post(`${baseURL}/api/v2/data`, {
          request_id,
          phone,
          service_id: NETWORK_MAP[network] || network || 'mtn',
          variation_id: item.code,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (vtuErr) {
        return res.status(502).json({ message: 'VTU provider error', error: vtuErr.message })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { coins: { decrement: item.price } }
    })

    res.json({ message: 'Data plan redeemed successfully!', coins: updatedUser.coins })
  } catch (error) {
    res.status(500).json({ message: 'Redemption failed', error: error.message })
  }
}
