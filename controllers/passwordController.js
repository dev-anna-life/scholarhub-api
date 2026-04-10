const User = require('../models/User')
const nodemailer = require('nodemailer')
const crypto = require('crypto')

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(404).json({ message: 'No account found with that email' })
        }

        const resetToken = crypto.randomBytes(32).toString('hex')
        user.resetToken = resetToken
        user.resetTokenExpiry = Date.now() + 3600000
        await user.save()

        const transporter = nodemailer.createTransport({

            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })

        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`

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

        res.json({ message: 'Password reset link sent to your email' })
    } catch  (error) { 
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params
        const { password } = req.body

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        })

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset link' })
        }

        const bcrypt = require('bcryptjs')
        user.password = await bcrypt.hash(password, 12)
        user.resetToken = undefined
        user.resetTokenExpiry = undefined
        await user.save()

        res.json({ message: 'Password reset successful! You can now login.' })
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}

module.exports = { forgotPassword, resetPassword}