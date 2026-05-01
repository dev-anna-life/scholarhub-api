const express = require("express");
const router = express.Router();
const { signup, login, getMe, googleLogin, getLeaderboard } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post('/google', googleLogin)
router.get('/leaderboard', getLeaderboard)

module.exports = router;
