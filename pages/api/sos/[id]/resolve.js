const dbConnect = require('../../../../lib/db')
const SOS = require('../../../../models/SOS')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { id } = req.query

    const sos = await SOS.findById(id)
    if (!sos) return res.status(404).json({ message: 'SOS alert not found' })

    // Optionally restrict to admins or the person who created it
    if (sos.status === 'resolved') {
        return res.status(400).json({ message: 'SOS alert is already resolved' })
    }

    sos.status = 'resolved'
    sos.resolvedAt = new Date()
    sos.resolvedBy = user._id
    await sos.save()

    res.json({ message: 'SOS alert resolved successfully', alert: sos })
  } catch (error) {
    console.error('SOS resolve error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
