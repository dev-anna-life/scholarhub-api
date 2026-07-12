const dbConnect = require('../../../../lib/db')
const prisma = require('../../../../lib/prisma')

export default async function handler(req, res) {
  try {
    await dbConnect()
    const { password, ...user } = await prisma.user.findUnique({ where: { id: req.query.id } })
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
