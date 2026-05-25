const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const { generateToken } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const { name, email, username, password, school, level, course } = req.body
    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: 'Name, email, username, and password are required' })
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] })
    if (existing) return res.status(400).json({ message: 'Email or username already taken' })

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      name, email, username, password: hashedPassword,
      school: school || '', level: level || 'University',
      course: course || '', coins: 50,
    })
    const token = generateToken(user._id)
    res.status(201).json({
      token,
      user: {
        id: user._id, name: user.name, email: user.email, username: user.username,
        avatar: user.avatar, school: user.school, level: user.level, course: user.course,
        bio: user.bio, coins: user.coins, achievements: user.achievements || [],
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
