const dbConnect = require('../../../lib/db')
const SOS = require('../../../models/SOS')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    // Allow admins or campus security to see active alerts
    // For now, return all active SOS alerts
    const alerts = await SOS.find({ status: 'active' }).populate('student', 'name username avatar').sort({ createdAt: -1 })

    res.json(alerts)
  } catch (error) {
    console.error('SOS active error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
