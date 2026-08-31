const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
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
    const { email: rawEmail, otp, newPassword } = req.body

    if (!rawEmail || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' })
    }

    const email = rawEmail.trim().toLowerCase()
    const otpResult = verifyOTP(email, otp.toString())
    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.message })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.updateMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      data: { password: hashedPassword }
    })

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now sign in with your new password.'
    })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to reset password.' })
  }
}
