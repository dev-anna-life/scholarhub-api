const express = require('express')
const router = express.Router()
const { createPost, getPosts, getMyPosts } = require('../controllers/postController')
const { protect } = require('../middleware/authMiddleware')


router.post('/', protect, createPost)
router.get('/', getPosts)
router.get('/my', protect, getMyPosts)

module.exports = router 