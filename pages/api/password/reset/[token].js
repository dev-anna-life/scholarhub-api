const bcrypt = require('bcryptjs')
const prisma = require('../../../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ message: 'Password is required' })
    const user = await prisma.user.findFirst({
      where: {
        resetToken: req.query.token,
        resetTokenExpiry: { gt: new Date() }
      }
    })
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' })
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 12),
        resetToken: null,
        resetTokenExpiry: null,
      }
    })
    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
