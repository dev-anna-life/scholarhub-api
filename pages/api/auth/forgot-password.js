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
    const { email: rawEmail } = req.body

    if (!rawEmail || !rawEmail.trim()) {
      return res.status(400).json({ message: 'Email address is required' })
    }

    const email = rawEmail.trim().toLowerCase()
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (!existingUser) {
      return res.status(404).json({ message: 'No account found with this email address.' })
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    saveOTP(email, '', otpCode)
    await sendVerificationEmail(email, otpCode)

    return res.status(200).json({
      success: true,
      message: `Password reset code sent to ${email}`
    })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to send password reset code.' })
  }
}
