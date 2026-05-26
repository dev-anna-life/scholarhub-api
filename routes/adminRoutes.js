const express = require("express");
const router = express.Router()
const { getPendingPosts, approvePost, rejectPost, getAllUsers, getStats, deleteUser, deleteAnyPost, cleanupChats } = require("../controllers/adminController");
const { protect } = require('../middleware/authMiddleware')

router.get('/posts/pending', protect, getPendingPosts)
router.put('/posts/:id/approve', protect, approvePost)
router.put('/posts/:id/reject', protect, rejectPost)
router.get('/users', protect, getAllUsers)
router.delete('/users/:id', protect, deleteUser)
router.delete('/posts/:id', protect, deleteAnyPost)
router.post('/cleanup', protect, cleanupChats)
router.get('/stats', protect, getStats)

module.exports = router