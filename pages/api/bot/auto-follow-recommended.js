const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const cors = require('cors')

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result)
      return resolve(result)
    })
  })
}

const corsMiddleware = cors({ methods: ['POST', 'OPTIONS'] })

export default async function handler(req, res) {
  await runMiddleware(req, res, corsMiddleware)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  try {
    await dbConnect()
    const { userId, track, skillDomain } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const userTrack = track || user.track || skillDomain || ''

    // Find bots matching track or general bots
    const targetBots = await prisma.user.findMany({
      where: {
        email: { startsWith: 'bot_' },
      },
      take: 5
    })

    if (targetBots.length === 0) {
      return res.status(200).json({ message: 'No bot accounts found to follow yet.' })
    }

    const followOps = targetBots.map(bot => 
      prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: bot.id,
          }
        },
        create: {
          followerId: userId,
          followingId: bot.id,
        },
        update: {}
      })
    )

    await Promise.all(followOps)

    console.log(`[AUTO-FOLLOW SUCCESS] User ${user.username || userId} auto-followed ${targetBots.length} bots.`)

    return res.status(200).json({
      success: true,
      message: `Auto-followed ${targetBots.length} recommended track accounts!`,
      followedBots: targetBots.map(b => b.username)
    })
  } catch (err) {
    console.error('[AUTO-FOLLOW ERROR]', err)
    return res.status(500).json({ message: err.message || 'Failed to auto-follow recommended bots.' })
  }
}
