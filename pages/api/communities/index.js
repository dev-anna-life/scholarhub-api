const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { search, type, school, faculty, notMember } = req.query
      const where = {}
      if (search) where.name = { contains: search, mode: 'insensitive' }
      if (type) where.type = type
      if (school) where.school = school
      if (faculty) where.faculty = faculty
      if (notMember) where.members = { none: { userId: notMember } }
      const communities = await prisma.community.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        take: 30,
      })
      return res.json(communities)
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      const { name, type, school, faculty, department } = req.body
      if (!name || !type) return res.status(400).json({ message: 'Name and type are required' })
      const existing = await prisma.community.findFirst({
        where: { name, type, school, faculty, department }
      })
      if (existing) return res.status(400).json({ message: 'Community already exists' })
      const community = await prisma.community.create({
        data: {
          name, type, school, faculty, department,
          createdById: user.id,
          members: { create: { userId: user.id } }
        },
      })
      return res.status(201).json(community)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
