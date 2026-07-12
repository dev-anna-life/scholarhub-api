const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    if (!user.referralCode) {
      const base = (user.username || user.name || 'user').toLowerCase().replace(/\s+/g, '')
      const referralCode = base + Math.floor(Math.random() * 10000)
      await prisma.user.update({ where: { id: user.id }, data: { referralCode } })
      user.referralCode = referralCode
    }

    const refCount = await prisma.user.count({ where: { referredById: user.id } })
    const refEarnings = refCount * 20

    res.json({
      referralCode: user.referralCode,
      referralLink: `https://scholarhub-app.vercel.app/signup?ref=${user.referralCode}`,
      totalReferrals: refCount,
      earningsFromReferrals: refEarnings,
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
