const dbConnect = require('../../../lib/db')
const SchoolRequest = require('../../../models/SchoolRequest')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    await dbConnect()

    if (req.method === 'GET') {
      const { status } = req.query
      const filter = {}
      if (status) filter.status = status
      const requests = await SchoolRequest.find(filter)
        .populate('requestedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean()
      return res.json(requests)
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      const { name, location, level } = req.body
      if (!name) return res.status(400).json({ message: 'School name is required' })
      const existing = await SchoolRequest.findOne({ name: { $regex: `^${name}$`, $options: 'i' }, status: 'pending' })
      if (existing) return res.status(400).json({ message: 'A request for this school is already pending' })
      const request = await SchoolRequest.create({ name, location, level, requestedBy: user._id })
      return res.status(201).json(request)
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
