const jwt = require('jsonwebtoken')
const prisma = require('./prisma')

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
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { badgeSubscriptions: true },
    })
    if (!user) {
      res.status(401).json({ message: 'User not found' })
      return null
    }
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' })
    return null
  }
}

module.exports = { generateToken, protect }
