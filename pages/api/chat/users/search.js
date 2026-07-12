const prisma = require('../../../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { q } = req.query
    if (!q || q.length < 2) return res.json([])

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
          { school: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, username: true, school: true, level: true, badge: true },
      take: 20,
    })

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
