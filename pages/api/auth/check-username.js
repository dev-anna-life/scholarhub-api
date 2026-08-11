const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const { username } = req.query
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username parameter is required' })
    }

    const cleanUsername = username.trim().toLowerCase()
    if (cleanUsername.length < 3) {
      return res.json({ available: false, message: 'Username must be at least 3 characters' })
    }

    const existing = await prisma.user.findFirst({
      where: { username: { equals: cleanUsername, mode: 'insensitive' } }
    })

    if (existing) {
      return res.json({ available: false, message: 'Username is already taken' })
    }

    return res.json({ available: true, message: 'Username is available' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
