const express = require('express')
const router = express.Router()
const Notification = require('../models/Notification')
const { protect } = require('../middleware/authMiddleware')

router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate('sender', 'name school')
            .populate('post', 'title')
            .sort({ createdAt: -1 })
            .limit(20)
        res.json(notifications)
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

router.patch('/read', protect, async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true })
        res.json({ message: 'All notifications marked as read' })
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

module.exports = router