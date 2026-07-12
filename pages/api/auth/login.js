const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { generateToken } = require('../../../lib/auth')
const rateLimit = require('../../../middleware/rateLimit')
const { z } = require('zod')

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
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

    const { email, password } = validationResult.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' })

    const token = generateToken(user.id)
    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, username: user.username,
        avatar: user.avatar, school: user.school, level: user.level,
        status: user.status, secondaryClass: user.secondaryClass,
        course: user.course,
        bio: user.bio, coins: user.coins,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
