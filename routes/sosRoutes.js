const express = require('express')
const router = express.Router()
const SOS = require('../models/SOS')
const User = require('../models/User')
const nodemailer = require('nodemailer')
const { protect } = require('../middleware/authMiddleware')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

router.post('/trigger', protect, async (req, res) => {
    try {
        const { message, latitude, longitude, address } = req.body
        const student = await User.findById(req.user.id).select('-password')

        const sos = await SOS.create({
            student: req.user.id,
            message: message || 'Student needs immediate help!',
            location: { latitude, longitude, address },
            status: 'active'
        })

        const alertHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #e63946; border-radius: 12px; overflow: hidden;">
            <div style="background: #e63946; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🚨 SOS ALERT</h1>
                <p style="color: white; margin: 8px 0 0; font-size: 16px;">A student needs immediate help!</p>
            </div>
            <div style="padding: 24px;">
                <div style="background: #fff5f5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                    <h2 style="color: #e63946; margin: 0 0 12px;">Student Details</h2>
                    <p style="margin: 6px 0;"><strong>Name:</strong> ${student.name}</p>
                    <p style="margin: 6px 0;"><strong>Email:</strong> ${student.email}</p>
                    <p style="margin: 6px 0;"><strong>School:</strong> ${student.school || 'Not specified'}</p>
                    <p style="margin: 6px 0;"><strong>Level:</strong> ${student.level || 'Not specified'}</p>
                    <p style="margin: 6px 0;"><strong>Phone:</strong> ${student.phone || 'Not provided'}</p>
                </div>
                <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                    <h3 style="margin: 0 0 8px; color: #333;">Message</h3>
                    <p style="margin: 0; font-size: 16px; color: #e63946; font-weight: bold;">${message || 'Student needs immediate help!'}</p>
                </div>
                ${latitude ? `
                <div style="background: #f0f9f0; border-radius: 8px; padding: 16px;">
                    <h3 style="margin: 0 0 8px; color: #333;">Location</h3>
                    <p style="margin: 6px 0;">${address || 'Location shared'}</p>
                    <a href="https://maps.google.com/?q=${latitude},${longitude}" 
                       style="display: inline-block; background: #008751; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
                        View on Google Maps
                    </a>
                </div>` : ''}
                <p style="margin: 20px 0 0; font-size: 12px; color: #888;">
                    Alert triggered at ${new Date().toLocaleString('en-NG')} via ScholarHub
                </p>
            </div>
        </div>`

        await transporter.sendMail({
            from: `"ScholarHub SOS" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `🚨 SOS ALERT - ${student.name} needs help!`,
            html: alertHtml
        })

        res.status(201).json({
            message: 'SOS alert sent successfully',
            sos: { ...sos.toObject(), student }
        })
    } catch (error) {
        console.error('SOS error:', error)
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

router.get('/active', protect, async (req, res) => {
    try {
        const alerts = await SOS.find({ status: 'active' })
            .populate('student', 'name email school level phone')
            .sort({ createdAt: -1 })
        res.json(alerts)
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

router.patch('/:id/resolve', protect, async (req, res) => {
    try {
        const sos = await SOS.findByIdAndUpdate(
            req.params.id,
            { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user.id },
            { new: true }
        )
        res.json(sos)
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

module.exports = router