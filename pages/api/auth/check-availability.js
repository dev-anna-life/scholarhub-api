const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const cors = require('cors')

// Helper for CORS middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result)
      return resolve(result)
    })
  })
}

const corsMiddleware = cors({ methods: ['POST', 'GET', 'OPTIONS'] })

export default async function handler(req, res) {
  await runMiddleware(req, res, corsMiddleware)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await dbConnect()
    const { email, phone, username } = req.body

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase()
      const existingEmail = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      })
      if (existingEmail) {
        return res.json({ available: false, field: 'email', message: 'This email address is already linked to an account. Please sign in instead.' })
      }
    }

    if (phone && phone.trim()) {
      const cleanPhone = phone.trim()
      const existingPhone = await prisma.user.findFirst({
        where: { phone: cleanPhone },
      })
      if (existingPhone) {
        return res.json({ available: false, field: 'phone', message: 'This phone number is already linked to an account. Please use a different number.' })
      }
    }

    if (username && username.trim()) {
      const cleanUsername = username.trim().toLowerCase()
      if (cleanUsername.length < 5) {
        return res.json({ available: false, field: 'username', message: 'Username must be at least 5 characters' })
      }
      const existingUsername = await prisma.user.findFirst({
        where: { username: { equals: cleanUsername, mode: 'insensitive' } },
      })
      if (existingUsername) {
        return res.json({ available: false, field: 'username', message: 'Username is already taken' })
      }
    }

    return res.json({ available: true, message: 'Available' })
  } catch (err) {
    res.status(500).json({ available: false, message: err.message })
  }
}
