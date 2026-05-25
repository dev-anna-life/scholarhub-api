const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    // In production, use cloud storage (Cloudinary, S3, etc.)
    // For now, return a placeholder URL
    const { filename } = req.body
    const url = `https://placeholder.scholarhub.app/uploads/${filename || 'file'}`
    res.json({ url })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
