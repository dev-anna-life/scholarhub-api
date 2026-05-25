const express = require('express')
const router = express.Router()
const { createPost, getPosts, getMyPosts, deletePost, toggleLike, addComment, getComments } = require('../controllers/postController')
const { protect } = require('../middleware/authMiddleware')

router.post('/', protect, createPost)
router.get('/', getPosts)
router.get('/my', protect, getMyPosts)
router.delete('/:id', protect, deletePost)
router.post('/:id/like', protect, toggleLike)
router.post('/:id/comments', protect, addComment)
router.get('/:id/comments', getComments)

module.exports = router