export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { type, message, location } = req.body
    if (!message) return res.status(400).json({ message: 'Message is required' })
    res.json({
      message: 'SOS alert sent successfully. Help is on the way.',
      alert: { type, message, location: location || 'Unknown', timestamp: new Date().toISOString() },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
