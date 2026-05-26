const dotenv = require('dotenv')
const path = require('path')
const jwt = require('jsonwebtoken')
const dbConnect = require('./db')
const User = require('../models/User')

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

async function protect(req, res) {
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' })
    return null
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    await dbConnect()
    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      res.status(401).json({ message: 'User not found' })
      return null
    }
    return user
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' })
    return null
  }
}

module.exports = { generateToken, protect }
