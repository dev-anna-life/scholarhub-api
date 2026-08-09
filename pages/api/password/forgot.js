const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const prisma = require('../../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { email: rawIdentifier } = req.body
    if (!rawIdentifier || !rawIdentifier.trim()) {
      return res.status(400).json({ message: 'Email address or username is required' })
    }

    const identifier = rawIdentifier.trim()
    const lowerIdentifier = identifier.toLowerCase()

    // Find user by Email OR Username (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: lowerIdentifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: { equals: lowerIdentifier, mode: 'insensitive' } },
          { username: { equals: identifier, mode: 'insensitive' } },
        ]
      }
    })

    if (!user) {
      return res.json({ message: 'If an account exists with that email or username, a reset link has been sent.' })
    }

    // Generate secure 32-byte hex token valid for 1 hour
    const resetToken = crypto.randomBytes(32).toString('hex')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
      }
    })

    // Construct valid frontend reset URL
    const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'https://scholarhub-web.vercel.app'
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password/${resetToken}`

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        })

        await transporter.sendMail({
          from: `"ScholarHub Support" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Reset your ScholarHub password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #eee; padding: 24px; border-radius: 12px;">
              <h2 style="color: #008751; margin-top: 0;">ScholarHub Password Reset</h2>
              <p style="color: #333; font-size: 15px;">Hi <strong>${user.name}</strong>,</p>
              <p style="color: #555; font-size: 14px; line-height: 1.5;">You requested to reset your password for your ScholarHub account (<strong>@${user.username || 'user'}</strong>).</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetUrl}" style="background: #008751; color: white; padding: 14px 28px; font-weight: bold; border-radius: 10px; text-decoration: none; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #777; font-size: 13px;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #008751;">${resetUrl}</a></p>
              <p style="color: #999; font-size: 12px; margin-top: 24px; border-t: 1px solid #eee; padding-top: 12px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
            </div>
          `
        })
      } else {
        console.warn('EMAIL_USER or EMAIL_PASS not set. Reset URL generated:', resetUrl)
      }
    } catch (emailErr) {
      console.error('Email sending error:', emailErr.message)
    }

    res.json({ message: 'If an account exists with that email or username, a reset link has been sent.' })
  } catch (error) {
    console.error('Forgot password handler error:', error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
