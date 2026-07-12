const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { generateToken } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' })

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
