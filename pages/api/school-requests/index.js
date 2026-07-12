const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { status } = req.query
      const where = {}
      if (status) where.status = status
      const requests = await prisma.schoolRequest.findMany({
        where,
        include: { requestedBy: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return res.json(requests)
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      const { name, location, level } = req.body
      if (!name) return res.status(400).json({ message: 'School name is required' })
      const existing = await prisma.schoolRequest.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, status: 'pending' }
      })
      if (existing) return res.status(400).json({ message: 'A request for this school is already pending' })
      const request = await prisma.schoolRequest.create({
        data: { name, location, level, requestedById: user.id }
      })
      return res.status(201).json(request)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
