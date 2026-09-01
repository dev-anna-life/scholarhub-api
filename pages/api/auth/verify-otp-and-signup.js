const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { generateToken } = require('../../../lib/auth')
const { verifyOTP } = require('../../../lib/otpStore')
const { sendWelcomeEmail } = require('../../../lib/mailer')
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
    const submittedOtp = otp.toString().trim()

    // 1. Fetch user record from PostgreSQL
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    })

    // If an active account with a confirmed password already exists, block registration
    if (existingUser && existingUser.password !== null) {
      return res.status(400).json({ message: 'An account with this email already exists. Please sign in instead.' })
    }

    // 2. Validate OTP code against DB persistent record or Memory Store fallback
    let isOtpValid = false

    if (existingUser && existingUser.resetToken === submittedOtp) {
      if (existingUser.resetTokenExpiry && new Date() > new Date(existingUser.resetTokenExpiry)) {
        return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' })
      }
      isOtpValid = true
    } else {
      // Check memory store fallback
      const memoryCheck = verifyOTP(email, submittedOtp)
      if (memoryCheck.valid) {
        isOtpValid = true
      }
    }

    if (!isOtpValid) {
      return res.status(400).json({ message: 'No verification code found for this email, or invalid code. Please check your email and try again.' })
    }

    // 3. Double check username uniqueness among active accounts
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: { 
          username: { equals: username, mode: 'insensitive' },
          password: { not: null },
          id: existingUser ? { not: existingUser.id } : undefined
        },
      })
      if (existingUsername) {
        return res.status(400).json({ message: 'This username is already taken.' })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const referralCode = `${username || (name ? name.split(' ')[0] : 'user')}_${Math.floor(1000 + Math.random() * 9000)}`

    // Only pass schema-compliant fields to Prisma User model
    const userData = {
      name: name ? name.trim() : 'Student User',
      email,
      username: username || undefined,
      phone: phone ? phone.trim() : undefined,
      password: hashedPassword,
      isVerified: true,
      resetToken: null,
      resetTokenExpiry: null,
      school: school || '',
      level: level || 'University',
      course: course || skillDomain || '',
      track: track || scholarTrack || 'Science',
      state: state || '',
      city: city || '',
      country: country || 'United States',
      faculty: faculty || '',
      department: department || '',
      interests: Array.isArray(interests) ? interests : [],
      referralCode,
    }

    let newUser
    if (existingUser) {
      newUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: userData
      })
    } else {
      newUser = await prisma.user.create({
        data: userData
      })
    }

    // Dispatch branded Welcome Email to the user
    sendWelcomeEmail(newUser.email, newUser.name).catch(err => {
      console.warn('[WELCOME MAIL WARNING]', err.message)
    })

    const token = generateToken(newUser.id)

    const userObj = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      avatar: newUser.avatar,
      level: newUser.level,
      track: newUser.track,
      school: newUser.school,
      coins: newUser.coins,
      isVerified: newUser.isVerified,
      isAdmin: newUser.isAdmin,
    }

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: userObj,
    })
  } catch (err) {
    console.error('[VERIFY OTP & SIGNUP ERROR]', err)
    res.status(500).json({ message: err.message || 'Signup failed. Please try again.' })
  }
}
