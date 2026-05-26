const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    res.json({ isAdmin: adminEmails.includes(user.email?.toLowerCase()) })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
