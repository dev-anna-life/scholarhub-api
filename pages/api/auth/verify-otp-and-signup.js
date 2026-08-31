const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { generateToken } = require('../../../lib/auth')
const { verifyOTP } = require('../../../lib/otpStore')
const cors = require('cors')

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
    const { name, email: rawEmail, username: rawUsername, password, phone, otp, school, level, course, track, state, city, country, faculty, department, interests, scholarTrack, skillDomain, skillLevel } = req.body

    if (!rawEmail || !otp) {
      return res.status(400).json({ message: 'Email and 6-digit verification code are required' })
    }

    const email = rawEmail.trim().toLowerCase()
    const username = rawUsername ? rawUsername.trim().toLowerCase() : ''

    // Verify 6-Digit OTP Code
    const otpResult = verifyOTP(email, otp.toString())
    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.message })
    }

    // Double check email & username uniqueness
    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })
    if (existingEmail) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
      })
      if (existingUser) {
        return res.status(400).json({ message: 'This username is already taken.' })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const referralCode = `${username || name.split(' ')[0]}_${Math.floor(1000 + Math.random() * 9000)}`

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email,
        username: username || undefined,
        phone: phone ? phone.trim() : undefined,
        password: hashedPassword,
        school: school || '',
        level: level || 'University',
        course: course || '',
        track: track || 'Science',
        state: state || '',
        city: city || '',
        country: country || 'United States',
        faculty: faculty || '',
        department: department || '',
        interests: Array.isArray(interests) ? interests : [],
        referralCode,
        isVerified: true,
      },
    })

    const token = generateToken(newUser.id)

    // Omit sensitive data
    const sanitizedUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      phone: newUser.phone,
      school: newUser.school,
      level: newUser.level,
      coins: newUser.coins,
      referralCode: newUser.referralCode,
      isVerified: true,
    }

    return res.status(201).json({
      success: true,
      token,
      user: sanitizedUser,
      message: 'Account created and verified successfully!'
    })
  } catch (err) {
    console.error('[VERIFY OTP AND SIGNUP ERROR]', err)
    res.status(500).json({ message: err.message || 'Failed to complete signup.' })
  }
}
