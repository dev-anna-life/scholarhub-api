const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { generateToken } = require('../../../lib/auth')
const rateLimit = require('../../../middleware/rateLimit')
const { z } = require('zod')

const loginSchema = z.object({
  email: z.string().min(1, { message: 'Email or username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const isAllowed = rateLimit(req, res)
  if (!isAllowed) return

  try {
    await dbConnect()
    
    const validationResult = loginSchema.safeParse(req.body)
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors.map(err => err.message).join(', ')
      return res.status(400).json({ message: errorMsg })
    }

    const { email: rawIdentifier, password } = validationResult.data
    const identifier = rawIdentifier.trim()
    const lowerIdentifier = identifier.toLowerCase()

    // Support logging in via Email OR Username (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: lowerIdentifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: { equals: lowerIdentifier, mode: 'insensitive' } },
          { username: { equals: identifier, mode: 'insensitive' } },
        ]
      }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!user.password) {
      return res.status(401).json({ message: 'Account exists via Google Sign-In. Please sign in with Google.' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = generateToken(user.id)
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        school: user.school,
        level: user.level,
        status: user.status,
        secondaryClass: user.secondaryClass,
        course: user.course,
        bio: user.bio,
        coins: user.coins,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
