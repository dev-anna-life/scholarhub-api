const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { saveOTP } = require('../../../lib/otpStore')
const { sendVerificationEmail } = require('../../../lib/mailer')
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
    const { email: rawEmail, phone } = req.body

    if (!rawEmail || !rawEmail.trim()) {
      return res.status(400).json({ message: 'Email address is required' })
    }

    const email = rawEmail.trim().toLowerCase()
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Your email address is incomplete' })
    }

    // Only block if account is active with password
    const existingEmail = await prisma.user.findFirst({
      where: { 
        email: { equals: email, mode: 'insensitive' },
        password: { not: null },
      },
    })
    if (existingEmail) {
      return res.status(400).json({ message: 'This email address is already linked to an account. Please sign in instead.' })
    }

    if (phone && phone.trim()) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: phone.trim(), password: { not: null } },
      })
      if (existingPhone) {
        return res.status(400).json({ message: 'This phone number is already linked to an account.' })
      }
    }

    // Generate secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    saveOTP(email, phone, otpCode)

    // Dispatch real email via Nodemailer
    const mailResult = await sendVerificationEmail(email, otpCode)

    if (mailResult && mailResult.error) {
      console.error(`[MAIL DISPATCH FAILED] ${mailResult.error}`)
      return res.status(500).json({
        message: 'Could not send verification email. Please verify SMTP credentials or generate a fresh Google App Password.'
      })
    }

    console.log(`[SECURITY OTP] Real email sent with 6-digit code to ${email}`)

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${email}`
    })
  } catch (err) {
    console.error('[SEND OTP ERROR]', err)
    res.status(500).json({ message: err.message || 'Failed to send verification code. Please try again.' })
  }
}
