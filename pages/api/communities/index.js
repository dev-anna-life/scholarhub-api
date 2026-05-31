const dbConnect = require('../../../lib/db')
const Community = require('../../../models/Community')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    await dbConnect()

    if (req.method === 'GET') {
      const { search, type, school, faculty, notMember } = req.query
      const filter = {}
      if (search) filter.name = { $regex: search, $options: 'i' }
      if (type) filter.type = type
      if (school) filter.school = school
      if (faculty) filter.faculty = faculty
      if (notMember) filter.members = { $ne: notMember }
      const communities = await Community.find(filter).sort({ type: 1, name: 1 }).limit(30).lean()
      return res.json(communities)
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      const { name, type, school, faculty, department } = req.body
      if (!name || !type) return res.status(400).json({ message: 'Name and type are required' })
      const existing = await Community.findOne({ name, type, school, faculty, department })
      if (existing) return res.status(400).json({ message: 'Community already exists' })
      const community = await Community.create({
        name, type, school, faculty, department,
        members: [user._id],
        createdBy: user._id,
      })
      return res.status(201).json(community)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
