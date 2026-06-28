const dbConnect = require('../../../lib/db')
const SOS = require('../../../models/SOS')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { type, message, location } = req.body
    if (!message) return res.status(400).json({ message: 'Message is required' })

    const sos = await SOS.create({
      student: user._id,
      message,
      location: location || { address: 'Unknown' },
      status: 'active'
    })

    res.status(201).json({
      message: 'SOS alert sent successfully. Help is on the way.',
      alert: sos,
    })
  } catch (error) {
    console.error('SOS trigger error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
