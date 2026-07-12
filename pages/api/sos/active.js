const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const alerts = await prisma.sOS.findMany({
      where: { status: 'active' },
      include: { student: { select: { name: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    })

    res.json(alerts)
  } catch (error) {
    console.error('SOS active error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
