const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const prisma = require('../../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' })

    const resetToken = crypto.randomBytes(32).toString('hex')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 3600000),
      }
    })

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      })

      const resetUrl = `https://scholar-hub-seven.vercel.app/reset-password/${resetToken}`

      await transporter.sendMail({
        from: `"ScholarHub" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Reset your ScholarHub password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #008751;">ScholarHub Password Reset</h2>
            <p>Hi ${user.name},</p>
            <p>You requested to reset your password. Click the button below:</p>
            <a href="${resetUrl}" style="background: #008751; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 16px 0;">Reset Password</a>
            <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
          </div>
        `
      })
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message)
    }

    res.json({ message: 'If that email exists, a reset link has been sent' })
  } catch (error) {
    console.error('Forgot password error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
