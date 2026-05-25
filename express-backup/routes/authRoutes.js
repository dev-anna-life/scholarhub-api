const express = require("express");
const router = express.Router();
const { signup, login, getMe, googleLogin, getLeaderboard, updateProfile, updateSchool, changePassword, toggle2FA } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post('/google', googleLogin);
router.get('/leaderboard', getLeaderboard);
router.put('/profile', protect, updateProfile);
router.put('/school', protect, updateSchool);
router.put('/password', protect, changePassword);
router.put('/2fa', protect, toggle2FA);

module.exports = router;
