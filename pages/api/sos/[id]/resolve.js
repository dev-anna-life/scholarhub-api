const prisma = require('../../../../lib/prisma')
const { protect } = require('../../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    const { id } = req.query

    const sos = await prisma.sOS.findUnique({ where: { id } })
    if (!sos) return res.status(404).json({ message: 'SOS alert not found' })

    if (sos.status === 'resolved') {
      return res.status(400).json({ message: 'SOS alert is already resolved' })
    }

    const updated = await prisma.sOS.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedById: user.id,
      }
    })

    res.json({ message: 'SOS alert resolved successfully', alert: updated })
  } catch (error) {
    console.error('SOS resolve error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
