const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await prisma.user.updateMany({
      where: { AND: [{ monthlyCoinsMonth: { not: null } }, { monthlyCoinsMonth: { not: currentMonth } }] },
      data: { monthlyCoins: 0, monthlyCoinsMonth: currentMonth },
    })
    const users = await prisma.user.findMany({
      where: { monthlyCoins: { gt: 50 } },
      select: { name: true, username: true, avatar: true, school: true, level: true, monthlyCoins: true },
      orderBy: { monthlyCoins: 'desc' },
      take: 100,
    })
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
