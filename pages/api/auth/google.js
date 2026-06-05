const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
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

    let user = await User.findOne({ email: payload.email })
    if (user) {
      const token = generateToken(user._id)
      return res.json({
        token,
        user: {
          id: user._id, name: user.name, email: user.email, username: user.username,
          avatar: user.avatar, school: user.school, level: user.level,
          status: user.status, secondaryClass: user.secondaryClass,
          course: user.course, bio: user.bio, coins: user.coins,
        },
      })
    }

    const name = payload.name || payload.email.split('@')[0]
    const username = (payload.email.split('@')[0] + Math.floor(Math.random() * 1000)).toLowerCase()
    user = await User.create({ name, email: payload.email, username, googleId: payload.sub || '', coins: 50 })
    const token = generateToken(user._id)
    res.status(201).json({
      token, isNewUser: true,
      user: {
        id: user._id, name: user.name, email: user.email, username: user.username,
        avatar: user.avatar, school: user.school, level: user.level,
        status: user.status, secondaryClass: user.secondaryClass,
        course: user.course, bio: user.bio, coins: user.coins,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Google auth failed', error: error.message })
  }
}
