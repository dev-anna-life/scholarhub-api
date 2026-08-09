const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { generateToken } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const { credential } = req.body
    if (!credential) return res.status(400).json({ message: 'Credential token required' })

    let payload
    try {
      const parts = credential.split('.')
      if (parts.length === 3) payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    } catch {}
    if (!payload || !payload.email) return res.status(400).json({ message: 'Invalid Google credential' })

    const normalizedEmail = payload.email.trim().toLowerCase()

    // Case-insensitive lookup to find any existing account registered with this email
    let user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    })

    if (user) {
      // Link googleId if not previously set
      if (!user.googleId && payload.sub) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub }
        })
      }

      const token = generateToken(user.id)
      return res.json({
        token,
        user: {
          id: user.id, name: user.name, email: user.email, username: user.username,
          avatar: user.avatar, school: user.school, level: user.level,
          status: user.status, secondaryClass: user.secondaryClass,
          course: user.course, bio: user.bio, coins: user.coins,
        },
      })
    }

    // Creating a brand new user for this email
    const name = payload.name ? payload.name.trim() : normalizedEmail.split('@')[0]
    const baseUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '')
    const username = (baseUsername + Math.floor(Math.random() * 1000)).toLowerCase()
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    
    user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        username,
        googleId: payload.sub || '',
        coins: 50,
        monthlyCoins: 50,
        monthlyCoinsMonth: currentMonth
      },
    })

    const token = generateToken(user.id)
    res.status(201).json({
      token, isNewUser: true,
      user: {
        id: user.id, name: user.name, email: user.email, username: user.username,
        avatar: user.avatar, school: user.school, level: user.level,
        status: user.status, secondaryClass: user.secondaryClass,
        course: user.course, bio: user.bio, coins: user.coins,
      },
    })
  } catch (error) {
    console.error('Google auth error:', error)
    res.status(500).json({ message: 'Google authentication failed', error: error.message })
  }
}
